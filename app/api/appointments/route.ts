import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { Lead } from "@/models/Lead";
import { Appointment } from "@/models/Appointment";
import { Message } from "@/models/Message";

type AppointmentRequest = {
  leadId: string;
  appointment: string;
};

function getScheduledDate(
  label: string
) {
  const now = new Date();

  const date = new Date(now);

  if (
    label.startsWith("Tomorrow")
  ) {
    date.setDate(
      date.getDate() + 1
    );
  }

  if (
    label.startsWith("Friday")
  ) {
    const currentDay =
      date.getDay();

    const daysUntilFriday =
      (5 - currentDay + 7) % 7 ||
      7;

    date.setDate(
      date.getDate() +
        daysUntilFriday
    );
  }

  const timeMatch =
    label.match(
      /(\d{1,2}):(\d{2})\s(AM|PM)/
    );

  if (timeMatch) {
    let hours =
      Number(timeMatch[1]);

    const minutes =
      Number(timeMatch[2]);

    const period =
      timeMatch[3];

    if (
      period === "PM" &&
      hours !== 12
    ) {
      hours += 12;
    }

    if (
      period === "AM" &&
      hours === 12
    ) {
      hours = 0;
    }

    date.setHours(
      hours,
      minutes,
      0,
      0
    );
  }

  return date;
}

export async function POST(
  request: Request
) {
  try {
    const body: AppointmentRequest =
      await request.json();

    if (
      !body.leadId ||
      !body.appointment
    ) {
      return NextResponse.json(
        {
          error:
            "leadId and appointment are required.",
        },
        {
          status: 400,
        }
      );
    }

    await connectDB();

    const lead =
      await Lead.findById(
        body.leadId
      );

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

    const appointment =
      await Appointment.create({
        leadId: lead._id,

        businessId:
          lead.businessId,

        label:
          body.appointment,

        scheduledFor:
          getScheduledDate(
            body.appointment
          ),

        status: "scheduled",
      });

    await Lead.findByIdAndUpdate(
      lead._id,
      {
        status: "booked",
      }
    );

    await Message.create({
      leadId: lead._id,

      sender: "lead",

      content:
        body.appointment,
    });

    const confirmation =
      `Perfect! For this demo, we've reserved ${body.appointment}. In the production version this will connect to the business's real calendar.`;

    const aiMessage =
      await Message.create({
        leadId: lead._id,

        sender: "ai",

        content: confirmation,
      });

    return NextResponse.json({
      success: true,

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