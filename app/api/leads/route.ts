import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { Business } from "@/models/Business";
import { Lead } from "@/models/Lead";
import { Message } from "@/models/Message";

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
      });

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

    const lead =
      await Lead.create({
        businessId:
          business._id,

        status: "new",

        source:
          "public-lead-page",
      });

const welcomeText =
  business.aiSettings?.welcomeMessage?.trim() ||
  `Hi! 👋 I'm the AI assistant for ${business.name}. What can we help you with today?`;

    const welcomeMessage =
      await Message.create({
        leadId:
          lead._id,

        sender: "ai",

        content:
          welcomeText,
      });

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

        lead: {
          id:
            lead._id.toString(),

          industry: null,
          service: null,
          urgency: null,
          timeline: null,
          name: null,
          phone: null,
          status:
            lead.status,
          appointment: null,
        },

        messages: [
          {
            id:
              welcomeMessage._id.toString(),

            sender: "ai",

            text:
              welcomeMessage.content,
          },
        ],
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Create lead error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to create lead.",
      },
      {
        status: 500,
      }
    );
  }
}