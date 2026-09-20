import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { requireBusiness } from "@/lib/auth";
import { Business } from "@/models/Business";
import { validateRequestOrigin } from "@/lib/security/origin-protection";
type UpdateBusinessBody = {
  name?: string;
  industry?: string;
  email?: string;
  phone?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_NAME_LENGTH = 100;
const MAX_INDUSTRY_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_PHONE_LENGTH = 30;

export async function PATCH(request: Request) {
  try {
    const originError = validateRequestOrigin(request);

    if (originError) {
      return originError;
    }
    await connectDB();

    const currentBusiness = await requireBusiness();

    const body: UpdateBusinessBody = await request.json();

    const name = body.name?.trim();

    const industry = body.industry?.trim();

    const email = body.email?.trim().toLowerCase();

    const phone = body.phone?.trim();

    /* =========================================
       REQUIRED FIELDS
       ========================================= */

    if (!name || !industry || !email) {
      return NextResponse.json(
        {
          error: "Name, industry and email are required.",
        },
        {
          status: 400,
        },
      );
    }

    /* =========================================
       INPUT VALIDATION
       ========================================= */

    if (name.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        {
          error: "Business name cannot exceed 100 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (industry.length > MAX_INDUSTRY_LENGTH) {
      return NextResponse.json(
        {
          error: "Industry cannot exceed 100 characters.",
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

    if (phone && phone.length > MAX_PHONE_LENGTH) {
      return NextResponse.json(
        {
          error: "Phone number cannot exceed 30 characters.",
        },
        {
          status: 400,
        },
      );
    }

    /* =========================================
       EMAIL UNIQUENESS
       ========================================= */

    const emailOwner = await Business.findOne({
      email,

      _id: {
        $ne: currentBusiness._id,
      },
    }).lean();

    if (emailOwner) {
      return NextResponse.json(
        {
          error: "That email is already being used by another business.",
        },
        {
          status: 409,
        },
      );
    }

    /* =========================================
       UPDATE AUTHENTICATED BUSINESS ONLY
       ========================================= */

    const business = await Business.findByIdAndUpdate(
      currentBusiness._id,
      {
        name,
        industry,
        email,
        phone,
      },
      {
        new: true,
        runValidators: true,
      },
    ).lean();

    if (!business) {
      return NextResponse.json(
        {
          error: "Business not found.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,

      business: {
        id: business._id.toString(),

        name: business.name,

        industry: business.industry,

        email: business.email,

        phone: business.phone ?? "",
      },
    });
  } catch (error) {
    console.error("Update business error:", error);

    return NextResponse.json(
      {
        error: "Unable to update business settings.",
      },
      {
        status: 500,
      },
    );
  }
}
