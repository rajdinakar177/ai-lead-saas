import mongoose from "mongoose";
import { NextResponse } from "next/server";

import type { Timeline } from "@/lib/availability";
import { getAvailableAppointmentSlots } from "@/lib/appointments/availability";
import { getCurrentBusiness } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { applyRequestRateLimit } from "@/lib/request-rate-limit";
import { safeLogger } from "@/lib/security/safe-logger";

import { Appointment } from "@/models/Appointment";
import { Business } from "@/models/Business";
import { Lead } from "@/models/Lead";

const VALID_TIMELINES: Timeline[] = ["Today", "Tomorrow", "This week", "Next week"];

const MAX_PUBLIC_ACCESS_TOKEN_LENGTH = 200;

export async function GET(request: Request) {
  try {
    const rateLimitResponse = await applyRequestRateLimit({
      request,
      action: "public-availability",
      limit: 60,
      windowMs: 10 * 60 * 1000,
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { searchParams } = new URL(request.url);

    const leadId = searchParams.get("leadId");

    const timeline = searchParams.get("timeline") as Timeline | null;

    const publicAccessToken = request.headers.get("X-Lead-Access-Token");
    /*
     * Optional.
     *
     * Public booking does not send this.
     *
     * Dashboard rescheduling sends the current
     * appointment ID so the appointment does not
     * block its own existing slot.
     */
    const appointmentId = searchParams.get("appointmentId");

    /* =========================================
       BASIC VALIDATION
       ========================================= */

    if (!leadId || !timeline) {
      return NextResponse.json(
        {
          error: "leadId and timeline are required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!VALID_TIMELINES.includes(timeline)) {
      return NextResponse.json(
        {
          error: "Invalid timeline.",
        },
        {
          status: 400,
        },
      );
    }

    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      return NextResponse.json(
        {
          error: "Invalid lead ID.",
        },
        {
          status: 400,
        },
      );
    }

    if (appointmentId && !mongoose.Types.ObjectId.isValid(appointmentId)) {
      return NextResponse.json(
        {
          error: "Invalid appointment ID.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      publicAccessToken !== null &&
      (!publicAccessToken || publicAccessToken.length > MAX_PUBLIC_ACCESS_TOKEN_LENGTH)
    ) {
      return NextResponse.json(
        {
          error: "Invalid lead access token.",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    let lead;

    let business;

    let excludeAppointmentId: string | null = null;

    /* =========================================
       DASHBOARD RESCHEDULING

       appointmentId identifies this as the
       authenticated dashboard reschedule flow.

       Never trust appointmentId by itself.
       Require the logged-in business and verify
       both the lead and appointment belong to it.
       ========================================= */

    if (appointmentId) {
      const authenticatedBusiness = await getCurrentBusiness();
      if (!authenticatedBusiness) {
        return NextResponse.json(
          {
            error: "Unauthorized.",
          },
          {
            status: 401,
          },
        );
      }
      lead = await Lead.findOne({
        _id: leadId,
        businessId: authenticatedBusiness._id,
      }).lean();

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

      const appointment = await Appointment.findOne({
        _id: appointmentId,
        leadId: lead._id,
        businessId: authenticatedBusiness._id,
      })
        .select("_id")
        .lean();

      if (!appointment) {
        return NextResponse.json(
          {
            error: "Appointment not found.",
          },
          {
            status: 404,
          },
        );
      }

      business = await Business.findOne({
        _id: authenticatedBusiness._id,
      }).lean();

      excludeAppointmentId = appointment._id.toString();
    } else {
      /* =========================================
         PUBLIC BOOKING

         A MongoDB lead ID is NOT authorization.

         Public callers must prove access using:
         leadId + publicAccessToken
         ========================================= */

      if (!publicAccessToken) {
        return NextResponse.json(
          {
            error: "Lead access token is required.",
          },
          {
            status: 401,
          },
        );
      }

      lead = await Lead.findOne({
        _id: leadId,
        publicAccessToken,
      }).lean();

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

      business = await Business.findById(lead.businessId).lean();
    }

    /* =========================================
       BUSINESS VALIDATION
       ========================================= */

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

    /*
     * Defense-in-depth.
     *
     * The resolved lead and business must always
     * belong to the same tenant.
     */
    if (lead.businessId.toString() !== business._id.toString()) {
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
       VALIDATE AVAILABILITY
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

    const timezone = business.timezone ?? "America/Chicago";

    /* =========================================
       GET AVAILABLE SLOTS
       ========================================= */

    const slots = await getAvailableAppointmentSlots({
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
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    safeLogger.error("Availability error.", error);

    return NextResponse.json(
      {
        error: "Unable to load availability.",
      },
      {
        status: 500,
      },
    );
  }
}
