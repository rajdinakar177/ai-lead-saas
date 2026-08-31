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
import { requireBusiness } from "@/lib/auth";

import { Appointment } from "@/models/Appointment";
import { Business } from "@/models/Business";

type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled";

type StatusUpdateRequest = {
  status: AppointmentStatus;
};

type RescheduleRequest = {
  action: "reschedule";
  scheduledFor: string;
  timeline: Timeline;
};

type UpdateAppointmentRequest =
  | StatusUpdateRequest
  | RescheduleRequest;

const allowedStatuses: AppointmentStatus[] = [
  "confirmed",
  "completed",
  "cancelled",
];

const validTimelines: Timeline[] = [
  "Today",
  "Tomorrow",
  "This week",
  "Next week",
];

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const business =
      await requireBusiness();

    const { id } =
      await params;

    const body: UpdateAppointmentRequest =
      await request.json();

    await connectDB();

    const appointment =
      await Appointment.findOne({
        _id: id,
        businessId:
          business._id,
      });

    if (!appointment) {
      return NextResponse.json(
        {
          error:
            "Appointment not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      appointment.status ===
      "cancelled"
    ) {
      return NextResponse.json(
        {
          error:
            "Cancelled appointments cannot be updated.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      appointment.status ===
      "completed"
    ) {
      return NextResponse.json(
        {
          error:
            "Completed appointments cannot be updated.",
        },
        {
          status: 400,
        }
      );
    }

    // ---------------------------------
    // RESCHEDULE
    // ---------------------------------

    if (
      "action" in body &&
      body.action === "reschedule"
    ) {
      if (
        !body.scheduledFor ||
        !body.timeline
      ) {
        return NextResponse.json(
          {
            error:
              "scheduledFor and timeline are required.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !validTimelines.includes(
          body.timeline
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

      const newScheduledFor =
        new Date(
          body.scheduledFor
        );

      if (
        Number.isNaN(
          newScheduledFor.getTime()
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
        newScheduledFor.getTime() <=
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

      const businessData =
        await Business.findById(
          business._id
        ).lean();

      if (!businessData) {
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

      const availability =
        businessData.availability;

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
        businessData.timezone ??
        "America/Chicago";

      const dates =
        getDatesForTimeline(
          body.timeline,
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

      const requestedTime =
        newScheduledFor.getTime();

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

      const existingAppointment =
        await Appointment.findOne({
          _id: {
            $ne:
              appointment._id,
          },

          businessId:
            business._id,

          scheduledFor:
            newScheduledFor,

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

      appointment.scheduledFor =
        newScheduledFor;

      appointment.label =
        matchedSlot.label;

      await appointment.save();

      return NextResponse.json({
        success: true,

        appointment: {
          id:
            appointment._id.toString(),

          status:
            appointment.status,

          label:
            appointment.label,

          scheduledFor:
            appointment.scheduledFor,
        },
      });
    }

    // ---------------------------------
    // NORMAL STATUS UPDATE
    // ---------------------------------

    if (
      !("status" in body) ||
      !body.status ||
      !allowedStatuses.includes(
        body.status
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid appointment status.",
        },
        {
          status: 400,
        }
      );
    }

    appointment.status =
      body.status;

    await appointment.save();

    return NextResponse.json({
      success: true,

      appointment: {
        id:
          appointment._id.toString(),

        status:
          appointment.status,

        label:
          appointment.label,

        scheduledFor:
          appointment.scheduledFor,
      },
    });
  } catch (error) {
    console.error(
      "Appointment update error:",
      error
    );

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
          "Unable to update appointment.",
      },
      {
        status: 500,
      }
    );
  }
}