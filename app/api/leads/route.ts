import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { Business } from "@/models/Business";

type CreateLeadBody = {
  businessSlug?: string;
};

export async function POST(
  request: Request
) {
  try {
    const body: CreateLeadBody =
      await request.json();

    const businessSlug =
      body.businessSlug
        ?.trim()
        .toLowerCase();

    if (!businessSlug) {
      return NextResponse.json(
        {
          error:
            "Business slug is required.",
        },
        {
          status: 400,
        }
      );
    }

    await connectDB();

    const business =
      await Business.findOne({
        slug: businessSlug,
        emailVerified: true,
      }).lean();

    if (!business) {
      return NextResponse.json(
        {
          error:
            "Business not found.",
        },
        {
          status: 404,
        }
      );
    }

    const services: string[] =
      business.aiSettings?.services ??
      [];

    const welcomeText =
      business.aiSettings?.welcomeMessage?.trim() ||
      `Hi! 👋 Welcome to ${business.name}. What can we help you with today?`;

    const options =
      services.map(
        (service) => ({
          label: service,
          value: service,
        })
      );

    return NextResponse.json(
      {
        success: true,

        business: {
          id:
            business._id.toString(),

          name:
            business.name,

          slug:
            business.slug,

          industry:
            business.industry,
        },

        // Important:
        // No permanent Lead exists yet.
        lead: {
          id: null,

          industry:
            business.industry,

          service: null,

          location: null,

          urgency: null,

          timeline: null,

          name: null,

          phone: null,

          status: "new",

          appointment: null,
        },

        // Welcome message is temporary.
        // It is not written to MongoDB yet.
        messages: [
          {
            id:
              crypto.randomUUID(),

            sender: "ai",

            text:
              welcomeText,
          },
        ],

        options,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Initialize chat error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to initialize chat.",
      },
      {
        status: 500,
      }
    );
  }
}