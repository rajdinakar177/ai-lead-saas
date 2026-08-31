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
import { Business } from "@/models/Business";
import { Lead } from "@/models/Lead";
import { Appointment } from "@/models/Appointment";

export async function GET(
  request: Request
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const leadId =
      searchParams.get("leadId");

    const timeline =
      searchParams.get(
        "timeline"
      ) as Timeline | null;



    if (!leadId || !timeline) {
      return NextResponse.json(
        {
          error:
            "leadId and timeline are required.",
        },
        {
          status: 400,
        }
      );
    }

    const validTimelines: Timeline[] =
      [
        "Today",
        "Tomorrow",
        "This week",
        "Next week",
      ];

    if (
      !validTimelines.includes(
        timeline
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid timeline.",
        },
        {
          status: 400,
        }
      );
    }

    await connectDB();

    const lead =
      await Lead.findById(
        leadId
      ).lean();

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

    const timezone =
      business.timezone ??
      "America/Chicago";

    const availability =
      business.availability;

    if (
      !availability ||
      !availability.days?.length
    ) {
      return NextResponse.json(
        {
          timeline,
          timezone,
          slots: [],
        },
        {
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    const dates =
      getDatesForTimeline(
        timeline,
        timezone
      );

    const now =
      new Date();

    const slots: GeneratedSlot[] =
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

      slots.push(
        ...generatedSlots
      );
    }

    if (slots.length === 0) {
      return NextResponse.json(
        {
          timeline,
          timezone,
          slots: [],
        },
        {
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    const scheduledAppointments =
      await Appointment.find({
        businessId:
          business._id,

        status: {
          $in: [
            "scheduled",
            "confirmed",
          ],
        },

        scheduledFor: {
          $in: slots.map(
            (slot) =>
              new Date(
                slot.scheduledFor
              )
          ),
        },
      })
        .select(
          "scheduledFor"
        )
        .lean();

    const bookedTimes =
      new Set(
        scheduledAppointments.map(
          (appointment) =>
            new Date(
              appointment.scheduledFor
            ).getTime()
        )
      );

    const availableSlots =
      slots.filter(
        (slot) =>
          !bookedTimes.has(
            new Date(
              slot.scheduledFor
            ).getTime()
          )
      );

    return NextResponse.json(
      {
        timeline,
        timezone,
        slots:
          availableSlots,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error(
      "Availability error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to load availability.",
      },
      {
        status: 500,
      }
    );
  }
}