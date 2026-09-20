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
type AppointmentRequest = {
  leadId: string;
  appointment: string;
  scheduledFor: string;
};

const validTimelines: Timeline[] = ["Today", "Tomorrow", "This week", "Next week"];

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
    const body: AppointmentRequest = await request.json();

    if (!body.leadId || !body.appointment || !body.scheduledFor) {
      return NextResponse.json(
        {
          error: "leadId, appointment and scheduledFor are required.",
        },
        {
          status: 400,
        },
      );
    }

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

    const lead = await Lead.findById(body.leadId);

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

    /* =========================================
       ATOMIC DATABASE BOOKING

       Inside one MongoDB transaction:

       1. Create appointment
       2. Update lead → booked
       3. Save lead booking message
       4. Save AI confirmation message
       ========================================= */

    const booking = await bookAppointmentAtomically({
      lead,

      label: matchedSlot.label,

      scheduledFor,
    });

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
      console.error("Appointment booked email notification failed:", emailError);
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
      console.error("Google Calendar appointment sync failed:", googleError);

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
        console.error("Unable to save Google Calendar sync error:", syncErrorSaveError);
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
    console.error("Appointment error:", error);

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
