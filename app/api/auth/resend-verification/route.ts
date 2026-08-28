import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { Business } from "@/models/Business";
import {
  generateVerificationToken,
  sendVerificationEmail,
} from "@/lib/email-verification";

type Body = {
  email?: string;
};

export async function POST(
  request: Request
) {
  try {
    const body: Body =
      await request.json();

    const email =
      body.email
        ?.trim()
        .toLowerCase();

    if (!email) {
      return NextResponse.json(
        {
          error:
            "Email is required.",
        },
        {
          status: 400,
        }
      );
    }

    await connectDB();

    const business =
      await Business.findOne({
        email,
      });

    // Avoid revealing whether accounts exist.
    if (
      !business ||
      business.emailVerified
    ) {
      return NextResponse.json({
        success: true,
      });
    }

    const {
      token,
      tokenHash,
      expiresAt,
    } =
      generateVerificationToken();

    business.emailVerificationTokenHash =
      tokenHash;

    business.emailVerificationExpiresAt =
      expiresAt;

    await business.save();

    await sendVerificationEmail({
      email:
        business.email,

      businessName:
        business.name,

      token,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Resend verification error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to resend verification email.",
      },
      {
        status: 500,
      }
    );
  }
}