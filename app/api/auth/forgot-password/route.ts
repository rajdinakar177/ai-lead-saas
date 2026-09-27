import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { Business } from "@/models/Business";
import { createPasswordResetToken } from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/email/password-reset-email";
import { applyRequestRateLimit } from "@/lib/request-rate-limit";
import { safeLogger } from "@/lib/security/safe-logger";

type Body = {
  email?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_EMAIL_LENGTH = 254;

const GENERIC_RESPONSE = {
  success: true,
  message: "If an account exists for that email, a password reset link has been sent.",
};

export async function POST(request: Request) {
  try {
    const rateLimitResponse = await applyRequestRateLimit({
      request,
      action: "auth-forgot-password",
      limit: 5,
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

    if (email.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(email)) {
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

    /*
     * Always return the same response when
     * no matching account exists.
     *
     * This prevents account enumeration.
     */
    if (!business) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const { token, tokenHash, expiresAt } = createPasswordResetToken();

    /*
     * Store only the SHA-256 hash.
     * The raw token is sent by email only.
     *
     * Generating another reset link
     * automatically invalidates the old one.
     */
    business.passwordResetTokenHash = tokenHash;
    business.passwordResetExpiresAt = expiresAt;

    await business.save();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

    if (!appUrl) {
      throw new Error("NEXT_PUBLIC_APP_URL is not configured.");
    }

    const resetUrl = new URL("/reset-password", appUrl);

    resetUrl.searchParams.set("token", token);

    await sendPasswordResetEmail({
      businessEmail: business.email,
      businessName: business.name,
      resetUrl: resetUrl.toString(),
    });

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    safeLogger.error("Forgot password error.", error);

    return NextResponse.json(
      {
        error: "Unable to process password reset request.",
      },
      {
        status: 500,
      },
    );
  }
}
