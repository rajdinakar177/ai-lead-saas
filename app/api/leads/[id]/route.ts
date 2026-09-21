import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { requireBusiness } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { safeLogger } from "@/lib/security/safe-logger";

import { Appointment } from "@/models/Appointment";
import { Lead } from "@/models/Lead";
import { Message } from "@/models/Message";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const MAX_PUBLIC_ACCESS_TOKEN_LENGTH = 200;

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    /* ================================================
       VALIDATE LEAD ID
       ================================================ */

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          error: "Invalid lead ID.",
        },
        {
          status: 400,
        },
      );
    }

    const publicAccessToken = request.headers.get("X-Lead-Access-Token");

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

    /* ================================================
       PUBLIC CHAT ACCESS

       Public visitors are not authenticated businesses.

       They must prove access using:
       leadId + publicAccessToken
       ================================================ */

    if (publicAccessToken) {
      lead = await Lead.findOne({
        _id: id,
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
    } else {
      /* ================================================
         DASHBOARD ACCESS

         Authenticated businesses continue using the
         existing business ownership protection.
         ================================================ */

      const business = await requireBusiness();

      lead = await Lead.findOne({
        _id: id,
        businessId: business._id,
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
    }

    /* ================================================
       LOAD LEAD MESSAGES
       ================================================ */

    const messages = await Message.find({
      leadId: lead._id,
    })
      .sort({
        createdAt: 1,
      })
      .lean();

    /* ================================================
       LOAD LEAD APPOINTMENT

       Always scope by both lead and business.
       ================================================ */

    const appointment = await Appointment.findOne({
      leadId: lead._id,
      businessId: lead.businessId,
    })
      .sort({
        createdAt: -1,
      })
      .lean();

    /* ================================================
       RESPONSE
       ================================================ */

    return NextResponse.json(
      {
        success: true,

        lead: {
          id: lead._id.toString(),

          industry: lead.industry ?? null,

          service: lead.service ?? null,

          location: lead.location ?? null,

          urgency: lead.urgency ?? null,

          timeline: lead.timeline ?? null,

          name: lead.name ?? null,

          phone: lead.phone ?? null,

          status: lead.status ?? "new",

          appointment: appointment?.label ?? null,
        },

        messages: messages.map((message) => ({
          id: message._id.toString(),

          sender: message.sender === "lead" ? "user" : "ai",

          text: message.content,
        })),

        completed: Boolean(appointment),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    safeLogger.error("Get lead error.", error);

    return NextResponse.json(
      {
        error: "Unable to load lead.",
      },
      {
        status: 500,
      },
    );
  }
}
