import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { Business } from "@/models/Business";
import {
  hashVerificationToken,
} from "@/lib/email-verification";
import { createSession } from "@/lib/auth";

type VerifyBody = {
  token?: string;
};

export async function POST(
  request: Request
) {
  try {
    const body: VerifyBody =
      await request.json();

    const token =
      body.token?.trim();

    if (!token) {
      return NextResponse.json(
        {
          error:
            "Verification token is required.",
        },
        {
          status: 400,
        }
      );
    }

    await connectDB();

    const tokenHash =
      hashVerificationToken(
        token
      );

    const business =
      await Business.findOne({
        emailVerificationTokenHash:
          tokenHash,

        emailVerificationExpiresAt: {
          $gt: new Date(),
        },
      });

    if (!business) {
      return NextResponse.json(
        {
          error:
            "This verification link is invalid or has expired.",
        },
        {
          status: 400,
        }
      );
    }

    business.emailVerified = true;

    business.emailVerificationTokenHash =
      null;

    business.emailVerificationExpiresAt =
      null;

    await business.save();

    await createSession(
      business._id.toString()
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Verify email error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to verify email.",
      },
      {
        status: 500,
      }
    );
  }
}