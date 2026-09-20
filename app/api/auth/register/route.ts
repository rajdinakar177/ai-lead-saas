import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { Business } from "@/models/Business";

import { generateVerificationToken, sendVerificationEmail } from "@/lib/email-verification";

import { createUniqueBusinessSlug } from "@/lib/slug";
import { applyRequestRateLimit } from "@/lib/request-rate-limit";
type RegisterBody = {
  name?: string;
  industry?: string;
  email?: string;
  phone?: string;
  password?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const rateLimitResponse = await applyRequestRateLimit({
      request,
      action: "auth-register",
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    const body: RegisterBody = await request.json();

    const name = body.name?.trim();

    const industry = body.industry?.trim();

    const email = body.email?.trim().toLowerCase();

    const phone = body.phone?.trim();

    const password = body.password;

    /*
     * Required fields
     */
    if (!name || !industry || !email || !password) {
      return NextResponse.json(
        {
          error: "Business name, industry, email and password are required.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Prevent excessively large input
     * values from reaching MongoDB and
     * downstream services.
     */
    if (name.length > 100 || industry.length > 100) {
      return NextResponse.json(
        {
          error: "Business name and industry must be 100 characters or fewer.",
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

    if (phone && phone.length > 30) {
      return NextResponse.json(
        {
          error: "Phone number is too long.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * bcrypt only uses the first 72 bytes
     * of password input. Keep the accepted
     * password size within a predictable
     * range.
     */
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

    const existingBusiness = await Business.findOne({
      email,
    });

    if (existingBusiness) {
      return NextResponse.json(
        {
          error: existingBusiness.emailVerified
            ? "An account already exists with this email."
            : "This email is already registered but not verified.",
        },
        {
          status: 409,
        },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const { token, tokenHash, expiresAt } = generateVerificationToken();

    const slug = await createUniqueBusinessSlug(name);

    const business = await Business.create({
      name,
      slug,
      industry,
      email,
      phone,
      passwordHash,

      emailVerified: false,

      emailVerificationTokenHash: tokenHash,

      emailVerificationExpiresAt: expiresAt,
    });

    try {
      await sendVerificationEmail({
        email: business.email,

        businessName: business.name,

        token,
      });
    } catch (emailError) {
      await Business.findByIdAndDelete(business._id);

      throw emailError;
    }

    return NextResponse.json(
      {
        success: true,

        message: "Account created. Please verify your email.",

        email: business.email,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("Registration error:", error);

    return NextResponse.json(
      {
        error: "Unable to create account.",
      },
      {
        status: 500,
      },
    );
  }
}
