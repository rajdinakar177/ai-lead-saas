import { NextResponse } from "next/server";

import {
  generateSlotsForDate,
  getDatesForTimeline,
  getDayName,
  type AvailabilityDay,
  type GeneratedSlot,
  type Timeline,
} from "@/lib/availability";

import { connectDB } from "@/lib/mongodb";
import { Lead } from "@/models/Lead";
import { Business } from "@/models/Business";
import { Appointment } from "@/models/Appointment";
import { Message } from "@/models/Message";

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

    const scheduledFor =
      new Date(body.scheduledFor);

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

    await connectDB();

    // ----------------------------
    // Find lead
    // ----------------------------

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

    // ----------------------------
    // Find business
    // ----------------------------

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

    // ----------------------------
    // Validate lead timeline
    // ----------------------------

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

    // ----------------------------
    // Validate business availability
    // ----------------------------

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

    const timezone =
      business.timezone ??
      "America/Chicago";

    // ----------------------------
    // Generate real valid slots
    // ----------------------------

    const dates =
      getDatesForTimeline(
        timeline,
        timezone
      );

    const now =
      new Date();

    const validSlots: GeneratedSlot[] =
      [];

    for (
      const localDate of dates
    ) {
      const dayName =
        getDayName(
          localDate
        );

      const dayAvailability =
        availability.days.find(
          (
            item: AvailabilityDay
          ) =>
            item.day ===
            dayName
        );

      if (!dayAvailability) {
        continue;
      }

      const generatedSlots =
        generateSlotsForDate(
          localDate,
          dayAvailability,
          availability.slotDurationMinutes ??
          60,
          availability.bufferMinutes ??
          0,
          timezone,
          now
        );

      validSlots.push(
        ...generatedSlots
      );
    }

    // ----------------------------
    // Verify requested slot exists
    // ----------------------------

    const requestedTime =
      scheduledFor.getTime();

    const matchedSlot =
      validSlots.find(
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
            "That appointment time is not a valid available slot.",
        },
        {
          status: 400,
        }
      );
    }

    // ----------------------------
    // Prevent double booking
    // ----------------------------

    const existingAppointment =
      await Appointment.findOne({
        businessId:
          lead.businessId,

        scheduledFor,

        status: {
          $in: [
            "scheduled",
            "confirmed",
          ],
        },
      }).lean();

    if (existingAppointment) {
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

  

    // ----------------------------
    // Create appointment
    // ----------------------------

    const appointment =
      await Appointment.create({
        leadId:
          lead._id,

        businessId:
          lead.businessId,

        // Use server-generated label.
        // Do not trust browser label.
        label:
          matchedSlot.label,

        scheduledFor,

        status:
          "scheduled",
      });

    // ----------------------------
    // Update lead
    // ----------------------------

    await Lead.findByIdAndUpdate(
      lead._id,
      {
        status:
          "booked",
      }
    );

    // ----------------------------
    // Save booking message
    // ----------------------------

    await Message.create({
      leadId:
        lead._id,

      sender:
        "lead",

      content:
        matchedSlot.label,
    });

    // ----------------------------
    // AI confirmation
    // ----------------------------

    const confirmation =
      `Perfect! We've reserved ${matchedSlot.label}.`;

    const aiMessage =
      await Message.create({
        leadId:
          lead._id,

        sender:
          "ai",

        content:
          confirmation,
      });

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

    // MongoDB unique index protection
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