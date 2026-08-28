import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { Business } from "@/models/Business";
import { createSession } from "@/lib/auth";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(
  request: Request
) {
  try {
    const body: LoginBody =
      await request.json();

    const email =
      body.email
        ?.trim()
        .toLowerCase();

    const password =
      body.password;

    if (!email || !password) {
      return NextResponse.json(
        {
          error:
            "Email and password are required.",
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

    if (!business) {
      return NextResponse.json(
        {
          error:
            "Invalid email or password.",
        },
        {
          status: 401,
        }
      );
    }

    const passwordMatches =
      await bcrypt.compare(
        password,
        business.passwordHash
      );

    if (!passwordMatches) {
      return NextResponse.json(
        {
          error:
            "Invalid email or password.",
        },
        {
          status: 401,
        }
      );
    }
if (!business.emailVerified) {
  return NextResponse.json(
    {
      error:
        "Please verify your email before signing in.",

      code:
        "EMAIL_NOT_VERIFIED",

      email:
        business.email,
    },
    {
      status: 403,
    }
  );
}
    await createSession(
      business._id.toString()
    );

    return NextResponse.json({
      success: true,

      business: {
        id:
          business._id.toString(),

        name:
          business.name,

        email:
          business.email,
      },
    });
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to login.",
      },
      {
        status: 500,
      }
    );
  }
}