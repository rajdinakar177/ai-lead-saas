import { Types } from "mongoose";
import { NextResponse } from "next/server";

import type { Timeline } from "@/lib/availability";

import { connectDB } from "@/lib/mongodb";
import { getAvailableAppointmentSlots } from "@/lib/appointments/availability";
import { bookAppointmentAtomically } from "@/lib/appointments/book-appointment";
import { sendAppointmentBookedEmail } from "@/lib/email/send-appointment-booked-email";
import { createAppointmentGoogleEvent } from "@/lib/google-calendar/create-appointment-event";

import { Lead } from "@/models/Lead";
import { Business } from "@/models/Business";
import { Appointment } from "@/models/Appointment";
import { GoogleCalendarIntegration } from "@/models/GoogleCalendarIntegration";
import { applyRequestRateLimit } from "@/lib/request-rate-limit";
import { safeLogger } from "@/lib/security/safe-logger";
import { reserveAppointmentQuota, releaseAppointmentQuota } from "@/lib/appointment-quota";
import { hasSubscriptionFeature } from "@/lib/subscription-access";
type AppointmentRequest = {
  leadId: string;
  publicAccessToken: string;
  appointment: string;
  scheduledFor: string;
};

const validTimelines: Timeline[] = ["Today", "Tomorrow", "This week", "Next week"];
const MAX_PUBLIC_ACCESS_TOKEN_LENGTH = 200;
const MAX_APPOINTMENT_LABEL_LENGTH = 500;
const MAX_SCHEDULED_FOR_LENGTH = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateAppointmentRequest(value: unknown): string | null {
  if (!isRecord(value)) {
    return "Invalid request body.";
  }

  if (typeof value.leadId !== "string" || !Types.ObjectId.isValid(value.leadId)) {
    return "Invalid leadId.";
  }

  if (
    typeof value.publicAccessToken !== "string" ||
    !value.publicAccessToken ||
    value.publicAccessToken.length > MAX_PUBLIC_ACCESS_TOKEN_LENGTH
  ) {
    return "Invalid publicAccessToken.";
  }
  if (
    typeof value.appointment !== "string" ||
    !value.appointment.trim() ||
    value.appointment.length > MAX_APPOINTMENT_LABEL_LENGTH
  ) {
    return `appointment must be between 1 and ${MAX_APPOINTMENT_LABEL_LENGTH} characters.`;
  }

  if (
    typeof value.scheduledFor !== "string" ||
    !value.scheduledFor.trim() ||
    value.scheduledFor.length > MAX_SCHEDULED_FOR_LENGTH
  ) {
    return `scheduledFor must be between 1 and ${MAX_SCHEDULED_FOR_LENGTH} characters.`;
  }

  return null;
}

export async function POST(request: Request) {
  try {
    /* =========================================
       READ REQUEST
       ========================================= */
    const rateLimitResponse = await applyRequestRateLimit({
      request,
      action: "public-appointments",
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    let rawBody: unknown;

    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON body.",
        },
        {
          status: 400,
        },
      );
    }

    const validationError = validateAppointmentRequest(rawBody);

    if (validationError) {
      return NextResponse.json(
        {
          error: validationError,
        },
        {
          status: 400,
        },
      );
    }

    const body = rawBody as AppointmentRequest;

    /* =========================================
       VALIDATE DATE
       ========================================= */

    const scheduledFor = new Date(body.scheduledFor);

    if (Number.isNaN(scheduledFor.getTime())) {
      return NextResponse.json(
        {
          error: "Invalid appointment date.",
        },
        {
          status: 400,
        },
      );
    }

    if (scheduledFor.getTime() <= Date.now()) {
      return NextResponse.json(
        {
          error: "That appointment time has already passed.",
        },
        {
          status: 400,
        },
      );
    }

    /* =========================================
       CONNECT DATABASE
       ========================================= */

    await connectDB();

    /* =========================================
       FIND LEAD
       ========================================= */

    const lead = await Lead.findOne({
      _id: body.leadId,
      publicAccessToken: body.publicAccessToken,
    });

    if (!lead) {
      return NextResponse.json(
        {
          error: "Lead not found.",
        },
        {
          status: 404,
        },
      );
    }

    /* =========================================
       FIND BUSINESS
       ========================================= */

    const business = await Business.findById(lead.businessId).lean();

    if (!business) {
      return NextResponse.json(
        {
          error: "Business not found.",
        },
        {
          status: 404,
        },
      );
    }

    /* =========================================
       VALIDATE LEAD TIMELINE
       ========================================= */

    const timeline = lead.timeline as Timeline | undefined;

    if (!timeline || !validTimelines.includes(timeline)) {
      return NextResponse.json(
        {
          error: "Lead does not have a valid booking timeline.",
        },
        {
          status: 400,
        },
      );
    }

    /* =========================================
       VALIDATE BUSINESS AVAILABILITY
       ========================================= */

    const availability = business.availability;

    if (!availability || !availability.days?.length) {
      return NextResponse.json(
        {
          error: "Business availability is not configured.",
        },
        {
          status: 400,
        },
      );
    }

    /* =========================================
       GET CURRENTLY AVAILABLE SLOTS
       ========================================= */

    const availableSlots = await getAvailableAppointmentSlots({
      business,
      timeline,
    });

    /* =========================================
       VERIFY REQUESTED SLOT
       ========================================= */

    const requestedTime = scheduledFor.getTime();

    const matchedSlot = availableSlots.find(
      (slot) => new Date(slot.scheduledFor).getTime() === requestedTime,
    );

    if (!matchedSlot) {
      return NextResponse.json(
        {
          error: "That appointment time is no longer available. Please choose another time.",
        },
        {
          status: 409,
        },
      );
    }
    const appointmentQuota = await reserveAppointmentQuota(business);

    if (!appointmentQuota.allowed) {
      if (appointmentQuota.reason === "subscription_required") {
        return NextResponse.json(
          {
            error: "An active subscription is required to book appointments.",
            code: "SUBSCRIPTION_REQUIRED",
          },
          {
            status: 403,
          },
        );
      }

      if (appointmentQuota.reason === "billing_period_missing") {
        safeLogger.error(
          "Business subscription billing period is missing during appointment booking.",
          undefined,
          {
            businessId: business._id.toString(),
          },
        );

        return NextResponse.json(
          {
            error: "Subscription billing information is temporarily unavailable.",
            code: "BILLING_PERIOD_MISSING",
          },
          {
            status: 503,
          },
        );
      }

      return NextResponse.json(
        {
          error: "Monthly appointment limit reached.",
          code: "APPOINTMENT_LIMIT_REACHED",

          usage: {
            used: appointmentQuota.used,
            limit: appointmentQuota.limit,
            remaining: appointmentQuota.remaining,
          },
        },
        {
          status: 429,
        },
      );
    }
    /* =========================================
       ATOMIC DATABASE BOOKING

       Inside one MongoDB transaction:

       1. Create appointment
       2. Update lead → booked
       3. Save lead booking message
       4. Save AI confirmation message
       ========================================= */

    let booking;

    try {
      booking = await bookAppointmentAtomically({
        lead,

        label: matchedSlot.label,

        scheduledFor,
      });
    } catch (error) {
      try {
        await releaseAppointmentQuota(appointmentQuota.reservation);
      } catch (quotaError) {
        safeLogger.error("Failed to release appointment quota reservation.", quotaError);
      }

      throw error;
    }

    const appointment = booking.appointment;

    const aiMessage = booking.aiMessage;

    const confirmation = booking.confirmation;

    const appointmentId = appointment._id.toString();

    /* =========================================
       SEND EMAIL AFTER TRANSACTION

       Email failure must never undo a valid
       Leadquivo booking.
       ========================================= */

    try {
      await sendAppointmentBookedEmail({
        businessEmail: business.email,

        businessName: business.name,

        appointmentId,

        name: lead.name ?? null,

        phone: lead.phone ?? null,

        service: lead.service ?? null,

        location: lead.location ?? null,

        appointmentLabel: matchedSlot.label,
      });
    } catch (emailError) {
      safeLogger.error("Appointment booked email notification failed.", emailError);
    }

    /* =========================================
       GOOGLE CALENDAR SYNC

       This happens AFTER the MongoDB booking
       transaction has committed.

       Google Calendar is an optional external
       integration.

       Therefore:
       - Google success → save event ID
       - Google failure → keep appointment
       - Google failure must NEVER roll back
         the Leadquivo booking
       ========================================= */
    const googleCalendarEnabled = hasSubscriptionFeature(business.subscription, "googleCalendar");
    if (googleCalendarEnabled) {
      try {
        const googleEvent = await createAppointmentGoogleEvent({
          businessId: business._id.toString(),

          appointmentId,

          businessName: business.name,

          timezone: business.timezone || "UTC",

          slotDurationMinutes: availability.slotDurationMinutes || 60,

          scheduledFor: appointment.scheduledFor,

          customerName: lead.name || "Customer",

          customerPhone: lead.phone ?? null,

          customerEmail: lead.email ?? null,

          service: lead.service ?? null,

          location: lead.location ?? null,

          urgency: lead.urgency ?? null,

          timeline: lead.timeline ?? null,
        });

        /*
         * null means this business does not
         * currently have Google Calendar
         * connected. That is not an error.
         */
        if (googleEvent) {
          await Appointment.updateOne(
            {
              _id: appointment._id,

              businessId: business._id,
            },
            {
              $set: {
                googleCalendarEventId: googleEvent.eventId,

                googleCalendarId: googleEvent.calendarId,

                googleCalendarSyncedAt: new Date(),

                googleCalendarSyncError: null,
              },
            },
          );

          /*
           * Record successful integration
           * activity separately as well.
           */
          await GoogleCalendarIntegration.updateOne(
            {
              businessId: business._id,

              connected: true,
            },
            {
              $set: {
                lastSyncedAt: new Date(),

                lastSyncError: null,
              },
            },
          );
        }
      } catch (googleError) {
        safeLogger.error("Google Calendar appointment sync failed.", googleError);

        const errorMessage =
          googleError instanceof Error
            ? googleError.message
            : "Google Calendar synchronization failed.";

        /*
         * Save the sync failure on the
         * appointment for troubleshooting
         * and future retry support.
         */
        try {
          await Appointment.updateOne(
            {
              _id: appointment._id,

              businessId: business._id,
            },
            {
              $set: {
                googleCalendarSyncError: errorMessage,
              },
            },
          );

          await GoogleCalendarIntegration.updateOne(
            {
              businessId: business._id,
            },
            {
              $set: {
                lastSyncError: errorMessage,
              },
            },
          );
        } catch (syncErrorSaveError) {
          safeLogger.error("Unable to save Google Calendar sync error.", syncErrorSaveError);
        }
      }
    }
    /* =========================================
       SUCCESS RESPONSE
       ========================================= */

    return NextResponse.json({
      success: true,

      appointment: {
        id: appointmentId,

        label: appointment.label,

        scheduledFor: appointment.scheduledFor,
      },

      confirmation,

      messageId: aiMessage._id.toString(),
    });
  } catch (error) {
    safeLogger.error("Appointment error.", error);

    /* =========================================
       UNIQUE SLOT CONFLICT
       ========================================= */

    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      return NextResponse.json(
        {
          error: "That appointment time is no longer available. Please choose another time.",
        },
        {
          status: 409,
        },
      );
    }

    return NextResponse.json(
      {
        error: "Unable to save appointment.",
      },
      {
        status: 500,
      },
    );
  }
}
