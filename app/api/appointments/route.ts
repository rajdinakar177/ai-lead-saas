import { NextResponse } from "next/server";

import type { Timeline } from "@/lib/availability";

import { connectDB } from "@/lib/mongodb";
import { getAvailableAppointmentSlots } from "@/lib/appointments/availability";
import { bookAppointmentAtomically } from "@/lib/appointments/book-appointment";
import { sendAppointmentBookedEmail } from "@/lib/email/send-appointment-booked-email";

import { Lead } from "@/models/Lead";
import { Business } from "@/models/Business";

type AppointmentRequest = {
  leadId: string;
  appointment: string;
  scheduledFor: string;
};

const validTimelines: Timeline[] = [
  "Today",
  "Tomorrow",
  "This week",
  "Next week",
];

export async function POST(
  request: Request
) {
  try {
    /* =========================================
       READ REQUEST
       ========================================= */

    const body: AppointmentRequest =
      await request.json();

    if (
      !body.leadId ||
      !body.appointment ||
      !body.scheduledFor
    ) {
      return NextResponse.json(
        {
          error:
            "leadId, appointment and scheduledFor are required.",
        },
        {
          status: 400,
        }
      );
    }

    /* =========================================
       VALIDATE DATE
       ========================================= */

    const scheduledFor =
      new Date(
        body.scheduledFor
      );

    if (
      Number.isNaN(
        scheduledFor.getTime()
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid appointment date.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      scheduledFor.getTime() <=
      Date.now()
    ) {
      return NextResponse.json(
        {
          error:
            "That appointment time has already passed.",
        },
        {
          status: 400,
        }
      );
    }

    /* =========================================
       CONNECT DATABASE
       ========================================= */

    await connectDB();

    /* =========================================
       FIND LEAD
       ========================================= */

    const lead =
      await Lead.findById(
        body.leadId
      );

    if (!lead) {
      return NextResponse.json(
        {
          error:
            "Lead not found.",
        },
        {
          status: 404,
        }
      );
    }

    /* =========================================
       FIND BUSINESS
       ========================================= */

    const business =
      await Business.findById(
        lead.businessId
      ).lean();

    if (!business) {
      return NextResponse.json(
        {
          error:
            "Business not found.",
        },
        {
          status: 404,
        }
      );
    }

    /* =========================================
       VALIDATE LEAD TIMELINE
       ========================================= */

    const timeline =
      lead.timeline as
        | Timeline
        | undefined;

    if (
      !timeline ||
      !validTimelines.includes(
        timeline
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Lead does not have a valid booking timeline.",
        },
        {
          status: 400,
        }
      );
    }

    /* =========================================
       VALIDATE BUSINESS AVAILABILITY
       ========================================= */

    const availability =
      business.availability;

    if (
      !availability ||
      !availability.days?.length
    ) {
      return NextResponse.json(
        {
          error:
            "Business availability is not configured.",
        },
        {
          status: 400,
        }
      );
    }

    /* =========================================
       GET CURRENTLY AVAILABLE SLOTS

       Shared helper handles:
       - business working hours
       - timezone
       - slot duration
       - buffer
       - scheduled appointments
       - confirmed appointments
       ========================================= */

    const availableSlots =
      await getAvailableAppointmentSlots({
        business,
        timeline,
      });

    /* =========================================
       VERIFY REQUESTED SLOT
       ========================================= */

    const requestedTime =
      scheduledFor.getTime();

    const matchedSlot =
      availableSlots.find(
        (slot) =>
          new Date(
            slot.scheduledFor
          ).getTime() ===
          requestedTime
      );

    if (!matchedSlot) {
      return NextResponse.json(
        {
          error:
            "That appointment time is no longer available. Please choose another time.",
        },
        {
          status: 409,
        }
      );
    }

    /* =========================================
       ATOMIC DATABASE BOOKING

       These operations now happen inside
       one MongoDB transaction:

       1. Create appointment
       2. Update lead → booked
       3. Save lead booking message
       4. Save AI confirmation message
       ========================================= */

    const booking =
      await bookAppointmentAtomically({
        lead,

        label:
          matchedSlot.label,

        scheduledFor,
      });

    const appointment =
      booking.appointment;

    const aiMessage =
      booking.aiMessage;

    const confirmation =
      booking.confirmation;

    /* =========================================
       SEND EMAIL AFTER TRANSACTION

       Email is intentionally outside the
       transaction because it is an external
       side effect.

       A failed email must NOT roll back a
       successfully booked appointment.
       ========================================= */

    try {
      await sendAppointmentBookedEmail({
        businessEmail:
          business.email,

        businessName:
          business.name,

        appointmentId:
          appointment._id.toString(),

        name:
          lead.name ?? null,

        phone:
          lead.phone ?? null,

        service:
          lead.service ?? null,

        location:
          lead.location ?? null,

        appointmentLabel:
          matchedSlot.label,
      });
    } catch (emailError) {
      console.error(
        "Appointment booked email notification failed:",
        emailError
      );
    }

    /* =========================================
       SUCCESS RESPONSE
       ========================================= */

    return NextResponse.json({
      success:
        true,

      appointment: {
        id:
          appointment._id.toString(),

        label:
          appointment.label,

        scheduledFor:
          appointment.scheduledFor,
      },

      confirmation,

      messageId:
        aiMessage._id.toString(),
    });
  } catch (error) {
    console.error(
      "Appointment error:",
      error
    );

    /* =========================================
       UNIQUE SLOT CONFLICT

       MongoDB unique index is the final
       protection against two requests
       attempting to book the same slot
       concurrently.
       ========================================= */

    if (
      typeof error ===
        "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        {
          error:
            "That appointment time is no longer available. Please choose another time.",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json(
      {
        error:
          "Unable to save appointment.",
      },
      {
        status: 500,
      }
    );
  }
}