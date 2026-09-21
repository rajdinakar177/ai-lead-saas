import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { applyRequestRateLimit } from "@/lib/request-rate-limit";
import { safeLogger } from "@/lib/security/safe-logger";
import { Business } from "@/models/Business";

type CreateLeadBody = {
  businessSlug?: string;
};

const MAX_BUSINESS_SLUG_LENGTH = 100;

export async function POST(request: Request) {
  try {
    const rateLimitResponse = await applyRequestRateLimit({
      request,
      action: "public-leads",
      limit: 30,
      windowMs: 10 * 60 * 1000,
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    let rawBody: unknown;

    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON body.",
        },
        {
          status: 400,
        },
      );
    }

    if (typeof rawBody !== "object" || rawBody === null || Array.isArray(rawBody)) {
      return NextResponse.json(
        {
          error: "Invalid request body.",
        },
        {
          status: 400,
        },
      );
    }

    const body = rawBody as CreateLeadBody;

    if (
      body.businessSlug !== undefined &&
      (typeof body.businessSlug !== "string" || body.businessSlug.length > MAX_BUSINESS_SLUG_LENGTH)
    ) {
      return NextResponse.json(
        {
          error: `Business slug must be ${MAX_BUSINESS_SLUG_LENGTH} characters or fewer.`,
        },
        {
          status: 400,
        },
      );
    }

    const businessSlug = body.businessSlug?.trim().toLowerCase();

    if (!businessSlug) {
      return NextResponse.json(
        {
          error: "Business slug is required.",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    const business = await Business.findOne({
      slug: businessSlug,
      emailVerified: true,
    }).lean();

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

    const services: string[] = business.aiSettings?.services ?? [];

    const welcomeText =
      business.aiSettings?.welcomeMessage?.trim() ||
      `Hi! 👋 Welcome to ${business.name}. What can we help you with today?`;

    const options = services.map((service) => ({
      label: service,
      value: service,
    }));

    return NextResponse.json(
      {
        success: true,

        business: {
          id: business._id.toString(),

          name: business.name,

          slug: business.slug,

          industry: business.industry,
        },

        // Important:
        // No permanent Lead exists yet.
        lead: {
          id: null,

          industry: business.industry,

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
            id: crypto.randomUUID(),

            sender: "ai",

            text: welcomeText,
          },
        ],

        options,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    safeLogger.error("Initialize chat error.", error);

    return NextResponse.json(
      {
        error: "Unable to initialize chat.",
      },
      {
        status: 500,
      },
    );
  }
}
