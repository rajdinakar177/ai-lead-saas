import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
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
    const { id } = await context.params;

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

    const lead = await Lead.findById(id)
      .lean();

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

    const messages =
      await Message.find({
        leadId: id,
      })
        .sort({
          createdAt: 1,
        })
        .lean();

    const appointment =
      await Appointment.findOne({
        leadId: id,
      })
        .sort({
          createdAt: -1,
        })
        .lean();

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

      completed: Boolean(appointment),
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