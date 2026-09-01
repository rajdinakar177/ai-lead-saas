import { NextResponse } from "next/server";

import { sendSms } from "@/lib/sms/send-sms";

export async function POST(
  request: Request
) {
  try {
    const body = await request.json();

    const to =
      body.to as string | undefined;

    if (!to) {
      return NextResponse.json(
        {
          error: "Phone number is required.",
        },
        {
          status: 400,
        }
      );
    }

    const result =
      await sendSms({
        to,
        body:
          "sms_appointment_reminders",
      });

    return NextResponse.json({
      success: true,
      sid: result.sid,
      status: result.status,
    });
  } catch (error) {
    console.error(
      "Test SMS error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to send SMS.",
      },
      {
        status: 500,
      }
    );
  }
}