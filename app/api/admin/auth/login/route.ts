import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { createAdminSession } from "@/lib/admin-auth";
import { connectDB } from "@/lib/mongodb";
import { applyRequestRateLimit } from "@/lib/request-rate-limit";
import { safeLogger } from "@/lib/security/safe-logger";
import { Admin } from "@/models/Admin";

type AdminLoginBody = {
  email?: string;
  password?: string;
};

const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_BYTES = 72;

export async function POST(request: Request) {
  try {
    const rateLimitResponse = await applyRequestRateLimit({
      request,
      action: "admin-auth-login",
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body: AdminLoginBody = await request.json();

    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json(
        {
          error: "Email and password are required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      email.length > MAX_EMAIL_LENGTH ||
      Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES
    ) {
      return NextResponse.json(
        {
          error: "Invalid email or password.",
        },
        {
          status: 401,
        },
      );
    }

    await connectDB();

    const admin = await Admin.findOne({
      email,
      active: true,
    });

    if (!admin || !admin.passwordHash) {
      return NextResponse.json(
        {
          error: "Invalid email or password.",
        },
        {
          status: 401,
        },
      );
    }

    const passwordMatches = await bcrypt.compare(password, admin.passwordHash);

    if (!passwordMatches) {
      return NextResponse.json(
        {
          error: "Invalid email or password.",
        },
        {
          status: 401,
        },
      );
    }

    await createAdminSession(admin._id.toString());

    admin.lastLoginAt = new Date();

    await admin.save();

    return NextResponse.json({
      success: true,

      admin: {
        id: admin._id.toString(),
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (error) {
    safeLogger.error("Admin login error.", error);

    return NextResponse.json(
      {
        error: "Unable to login.",
      },
      {
        status: 500,
      },
    );
  }
}
