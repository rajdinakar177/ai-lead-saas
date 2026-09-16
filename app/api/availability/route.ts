import { NextResponse } from "next/server";

import type { Timeline } from "@/lib/availability";
import { getAvailableAppointmentSlots } from "@/lib/appointments/availability";
import { connectDB } from "@/lib/mongodb";

import { Business } from "@/models/Business";
import { Lead } from "@/models/Lead";
import { Appointment } from "@/models/Appointment";

const VALID_TIMELINES: Timeline[] = [
  "Today",
  "Tomorrow",
  "This week",
  "Next week",
];

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

    /*
     * Optional.
     *
     * Public/web booking does not send this.
     * Dashboard rescheduling sends the
     * current appointment ID so that
     * appointment does not block itself.
     */
    const appointmentId =
      searchParams.get(
        "appointmentId"
      );

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

    if (
      !VALID_TIMELINES.includes(
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

    /*
     * ---------------------------------
     * FIND LEAD
     * ---------------------------------
     */

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

    /*
     * ---------------------------------
     * FIND BUSINESS
     * ---------------------------------
     */

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

    /*
     * ---------------------------------
     * VALIDATE APPOINTMENT
     *
     * Only required during rescheduling.
     * This also prevents someone from
     * excluding another business's
     * appointment.
     * ---------------------------------
     */

    let excludeAppointmentId:
      string | null = null;

    if (appointmentId) {
      const appointment =
        await Appointment.findOne({
          _id:
            appointmentId,

          leadId:
            lead._id,

          businessId:
            business._id,
        })
          .select("_id")
          .lean();

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

      excludeAppointmentId =
        appointment._id.toString();
    }

    /*
     * ---------------------------------
     * VALIDATE AVAILABILITY
     * ---------------------------------
     */

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

    /*
     * ---------------------------------
     * GET AVAILABLE SLOTS
     * ---------------------------------
     */

    const slots =
      await getAvailableAppointmentSlots({
        business,
        timeline,
        excludeAppointmentId,
      });

    return NextResponse.json(
      {
        timeline,
        timezone,
        slots,
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