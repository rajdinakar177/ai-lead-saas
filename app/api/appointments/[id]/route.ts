import { NextResponse } from "next/server";

import type { Timeline } from "@/lib/availability";

import { getAvailableAppointmentSlots } from "@/lib/appointments/availability";

import { connectDB } from "@/lib/mongodb";
import { requireBusiness } from "@/lib/auth";

import { Appointment } from "@/models/Appointment";
import { Business } from "@/models/Business";
import { Lead } from "@/models/Lead";

import { sendAppointmentRescheduledEmail } from "@/lib/email/send-appointment-rescheduled-email";
import { sendAppointmentCancelledEmail } from "@/lib/email/send-appointment-cancelled-email";
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

type NotesUpdateRequest = {
  notes: string;
};

type UpdateAppointmentRequest =
  | StatusUpdateRequest
  | RescheduleRequest
  | NotesUpdateRequest;

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

    /*
     * Business isolation:
     * only appointments belonging
     * to the authenticated business
     * can be updated.
     */
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

    // ---------------------------------
    // NOTES UPDATE
    // ---------------------------------
    //
    // Keep this BEFORE the cancelled /
    // completed checks so businesses
    // can still add internal notes to
    // historical appointments.
    // ---------------------------------

    if ("notes" in body) {
      if (
        typeof body.notes !==
        "string"
      ) {
        return NextResponse.json(
          {
            error:
              "Notes must be a string.",
          },
          {
            status: 400,
          }
        );
      }

      const notes =
        body.notes.trim();

      if (
        notes.length > 2000
      ) {
        return NextResponse.json(
          {
            error:
              "Notes cannot exceed 2000 characters.",
          },
          {
            status: 400,
          }
        );
      }

      appointment.notes =
        notes || undefined;

      await appointment.save();

      return NextResponse.json({
        success: true,
        notes:
          appointment.notes ?? "",
      });
    }

    // ---------------------------------
    // BLOCK ACTIONS ON CANCELLED
    // ---------------------------------

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

    // ---------------------------------
    // BLOCK ACTIONS ON COMPLETED
    // ---------------------------------

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

      const validSlots =
        await getAvailableAppointmentSlots({
          business:
            businessData,

          timeline:
            body.timeline,

          excludeAppointmentId:
            appointment._id.toString(),
        });

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
      const previousAppointmentLabel =
        appointment.label;

      appointment.scheduledFor =
        newScheduledFor;

      appointment.label =
        matchedSlot.label;

      await appointment.save();
      /*
       * Notification happens AFTER the
       * appointment has been successfully
       * rescheduled.
       *
       * Email failure must never roll back
       * or fail the appointment update.
       */
      try {
        const lead =
          await Lead.findOne({
            _id: appointment.leadId,
            businessId:
              business._id,
          }).lean();

        if (
          lead &&
          businessData.email
        ) {
          await sendAppointmentRescheduledEmail({
            businessEmail:
              businessData.email,

            businessName:
              businessData.name,

            appointmentId:
              appointment._id.toString(),

            name:
              lead.name,

            phone:
              lead.phone,

            service:
              lead.service,

            location:
              lead.location,

            previousAppointmentLabel,

            newAppointmentLabel:
              matchedSlot.label,
          });
        }
      } catch (emailError) {
        console.error(
          "Appointment reschedule email failed:",
          emailError
        );
      }
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

    /*
     * Send cancellation notification
     * only when the appointment was
     * changed to cancelled.
     *
     * Notification happens AFTER save,
     * so an email failure cannot undo
     * the cancellation.
     */
    if (
      body.status === "cancelled"
    ) {
      try {
        const [
          lead,
          businessData,
        ] = await Promise.all([
          Lead.findOne({
            _id:
              appointment.leadId,

            businessId:
              business._id,
          }).lean(),

          Business.findById(
            business._id
          ).lean(),
        ]);

        if (
          lead &&
          businessData?.email
        ) {
          await sendAppointmentCancelledEmail({
            businessEmail:
              businessData.email,

            businessName:
              businessData.name,

            appointmentId:
              appointment._id.toString(),

            name:
              lead.name,

            phone:
              lead.phone,

            service:
              lead.service,

            location:
              lead.location,

            appointmentLabel:
              appointment.label,
          });
        }
      } catch (emailError) {
        console.error(
          "Appointment cancellation email failed:",
          emailError
        );
      }
    }

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