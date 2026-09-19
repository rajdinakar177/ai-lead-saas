import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { requireBusiness } from "@/lib/auth";

import { Lead } from "@/models/Lead";
import { Message } from "@/models/Message";
import { Appointment } from "@/models/Appointment";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    /* ================================================
       AUTHENTICATE BUSINESS
       ================================================ */

    const business =
      await requireBusiness();

    const { id } = await context.params;

    /* ================================================
       VALIDATE LEAD ID
       ================================================ */

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return NextResponse.json(
        {
          error: "Invalid lead ID.",
        },
        {
          status: 400,
        }
      );
    }

    await connectDB();

    /* ================================================
       LOAD LEAD + VERIFY OWNERSHIP

       Important:
       Never use findById(id) here.

       The businessId condition prevents one business
       from accessing another business's lead.
       ================================================ */

    const lead = await Lead.findOne({
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
        }
      );
    }

    /* ================================================
       LOAD LEAD MESSAGES
       ================================================ */

    const messages =
      await Message.find({
        leadId: lead._id,
      })
        .sort({
          createdAt: 1,
        })
        .lean();

    /* ================================================
       LOAD LEAD APPOINTMENT

       Include businessId as defense-in-depth.
       ================================================ */

    const appointment =
      await Appointment.findOne({
        leadId: lead._id,
        businessId: business._id,
      })
        .sort({
          createdAt: -1,
        })
        .lean();

    /* ================================================
       RESPONSE
       ================================================ */

    return NextResponse.json({
      success: true,

      lead: {
        id: lead._id.toString(),

        industry:
          lead.industry ?? null,

        service:
          lead.service ?? null,

        urgency:
          lead.urgency ?? null,

        timeline:
          lead.timeline ?? null,

        name:
          lead.name ?? null,

        phone:
          lead.phone ?? null,

        status:
          lead.status ?? "new",

        appointment:
          appointment?.label ?? null,
      },

      messages: messages.map(
        (message) => ({
          id:
            message._id.toString(),

          sender:
            message.sender === "lead"
              ? "user"
              : "ai",

          text: message.content,
        })
      ),

      completed:
        Boolean(appointment),
    });
  } catch (error) {
    console.error(
      "Get lead error:",
      error
    );

    return NextResponse.json(
      {
        error: "Unable to load lead.",
      },
      {
        status: 500,
      }
    );
  }
}