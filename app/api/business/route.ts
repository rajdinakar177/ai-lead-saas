import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { requireBusiness } from "@/lib/auth";
import { Business } from "@/models/Business";

type UpdateBusinessBody = {
  name?: string;
  industry?: string;
  email?: string;
  phone?: string;
};

export async function PATCH(request: Request) {
  try {
    await connectDB();

    const currentBusiness = await requireBusiness();

    const body: UpdateBusinessBody =
      await request.json();

    const name = body.name?.trim();
    const industry = body.industry?.trim();
    const email = body.email
      ?.trim()
      .toLowerCase();
    const phone = body.phone?.trim();

    if (!name || !industry || !email) {
      return NextResponse.json(
        {
          error:
            "Name, industry and email are required.",
        },
        {
          status: 400,
        }
      );
    }

    const emailOwner =
      await Business.findOne({
        email,
        _id: {
          $ne: currentBusiness._id,
        },
      }).lean();

    if (emailOwner) {
      return NextResponse.json(
        {
          error:
            "That email is already being used by another business.",
        },
        {
          status: 409,
        }
      );
    }

    const business =
      await Business.findByIdAndUpdate(
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
        }
      ).lean();

    if (!business) {
      return NextResponse.json(
        {
          error: "Business not found.",
        },
        {
          status: 404,
        }
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
    console.error(
      "Update business error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to update business settings.",
      },
      {
        status: 500,
      }
    );
  }
}