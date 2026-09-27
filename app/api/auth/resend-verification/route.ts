import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { Business } from "@/models/Business";

import { generateVerificationToken, sendVerificationEmail } from "@/lib/email-verification";
import { applyRequestRateLimit } from "@/lib/request-rate-limit";
import { safeLogger } from "@/lib/security/safe-logger";
type Body = {
  email?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const rateLimitResponse = await applyRequestRateLimit({
      request,
      action: "auth-resend-verification",
      limit: 3,
      windowMs: 60 * 60 * 1000,
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    const body: Body = await request.json();

    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        {
          error: "Email is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (email.length > 254 || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        {
          error: "Please enter a valid email address.",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    const business = await Business.findOne({
      email,
    });

    if (!business || business.emailVerified) {
      return NextResponse.json({
        success: true,
      });
    }

    /*
     * Generate a completely new
     * verification token.
     *
     * The previous verification token
     * becomes invalid as soon as the
     * new hash is stored.
     */
    const { token, tokenHash, expiresAt } = generateVerificationToken();

    business.emailVerificationTokenHash = tokenHash;

    business.emailVerificationExpiresAt = expiresAt;

    await business.save();

    await sendVerificationEmail({
      email: business.email,

      businessName: business.name,

      token,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    safeLogger.error("Resend verification error:", error);

    return NextResponse.json(
      {
        error: "Unable to resend verification email.",
      },
      {
        status: 500,
      },
    );
  }
}
