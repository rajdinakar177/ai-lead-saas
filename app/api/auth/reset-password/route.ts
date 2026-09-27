import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { hashPasswordResetToken } from "@/lib/password-reset";
import { applyRequestRateLimit } from "@/lib/request-rate-limit";
import { safeLogger } from "@/lib/security/safe-logger";
import { Business } from "@/models/Business";
import { Session } from "@/models/Session";

type ResetPasswordBody = {
  token?: string;
  password?: string;
};

const MAX_TOKEN_LENGTH = 512;

export async function POST(request: Request) {
  try {
    const rateLimitResponse = await applyRequestRateLimit({
      request,
      action: "auth-reset-password",
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body: ResetPasswordBody = await request.json();

    const token = body.token?.trim();
    const password = body.password;

    if (!token || !password) {
      return NextResponse.json(
        {
          error: "Reset token and new password are required.",
        },
        {
          status: 400,
        },
      );
    }

    if (token.length > MAX_TOKEN_LENGTH) {
      return NextResponse.json(
        {
          error: "Invalid or expired password reset link.",
        },
        {
          status: 400,
        },
      );
    }

    const passwordByteLength = Buffer.byteLength(password, "utf8");

    if (passwordByteLength < 8) {
      return NextResponse.json(
        {
          error: "Password must be at least 8 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (passwordByteLength > 72) {
      return NextResponse.json(
        {
          error: "Password is too long.",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    const tokenHash = hashPasswordResetToken(token);

    const passwordHash = await bcrypt.hash(password, 12);

    /*
     * Atomically consume the reset token.
     *
     * The update only succeeds when:
     * - the token hash matches
     * - the token has not expired
     *
     * The token is cleared in the same database
     * operation that changes the password, making
     * the reset link single-use.
     */
    const business = await Business.findOneAndUpdate(
      {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: {
          $gt: new Date(),
        },
      },
      {
        $set: {
          passwordHash,
          passwordResetTokenHash: null,
          passwordResetExpiresAt: null,
        },
      },
      {
        returnDocument: "after",
      },
    );

    if (!business) {
      return NextResponse.json(
        {
          error: "Invalid or expired password reset link.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Invalidate every existing login session
     * after the password has been changed.
     */
    await Session.deleteMany({
      businessId: business._id,
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. Please log in with your new password.",
    });
  } catch (error) {
    safeLogger.error("Reset password error.", error);

    return NextResponse.json(
      {
        error: "Unable to reset password.",
      },
      {
        status: 500,
      },
    );
  }
}
