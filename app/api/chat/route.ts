import { randomBytes } from "crypto";
import { Types } from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { validatePhoneNumber } from "@/lib/phone";
import { canFollowUp, getNextFollowUpAt } from "@/lib/follow-up";

import { Business } from "@/models/Business";
import { Lead } from "@/models/Lead";
import { Message } from "@/models/Message";

import {
  generateQualificationResponse,
  type AISettings,
  type ChatMessage,
  type LeadData,
} from "@/lib/ai/qualification";
import { applyRequestRateLimit } from "@/lib/request-rate-limit";
import { safeLogger } from "@/lib/security/safe-logger";
import { getSubscriptionAccess } from "@/lib/subscription-access";
import { consumeSubscriptionUsage, releaseSubscriptionUsage, } from "@/lib/subscription-usage";
/* =========================================================
   TYPES
   ========================================================= */

type RequestBody = {
  leadId?: string | null;
  publicAccessToken?: string | null;
  businessSlug?: string;
  messages: ChatMessage[];
  lead: LeadData;
};

const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_BUSINESS_SLUG_LENGTH = 100;
const MAX_PUBLIC_ACCESS_TOKEN_LENGTH = 200;
const MAX_LEAD_FIELD_LENGTH = 500;

const LEAD_TEXT_FIELDS = [
  "industry",
  "service",
  "location",
  "urgency",
  "timeline",
  "name",
  "phone",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateRequestBody(value: unknown): string | null {
  if (!isRecord(value)) {
    return "Invalid request body.";
  }

  if (!Array.isArray(value.messages)) {
    return "messages are required.";
  }

  if (value.messages.length > MAX_MESSAGES) {
    return `A maximum of ${MAX_MESSAGES} messages is allowed per request.`;
  }

  for (const message of value.messages) {
    if (!isRecord(message)) {
      return "Each message must be a valid object.";
    }

    if (message.sender !== "user" && message.sender !== "ai") {
      return "Each message must have a valid sender.";
    }

    if (typeof message.text !== "string") {
      return "Each message must contain text.";
    }

    if (message.text.length > MAX_MESSAGE_LENGTH) {
      return `Each message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`;
    }
  }

  if (
    value.businessSlug !== undefined &&
    (typeof value.businessSlug !== "string" || value.businessSlug.length > MAX_BUSINESS_SLUG_LENGTH)
  ) {
    return `businessSlug must be ${MAX_BUSINESS_SLUG_LENGTH} characters or fewer.`;
  }

  if (
    value.leadId !== undefined &&
    value.leadId !== null &&
    (typeof value.leadId !== "string" || !Types.ObjectId.isValid(value.leadId))
  ) {
    return "Invalid leadId.";
  }

  if (
    value.publicAccessToken !== undefined &&
    value.publicAccessToken !== null &&
    (typeof value.publicAccessToken !== "string" ||
      value.publicAccessToken.length > MAX_PUBLIC_ACCESS_TOKEN_LENGTH)
  ) {
    return "Invalid publicAccessToken.";
  }

  if (!isRecord(value.lead)) {
    return "lead is required.";
  }

  for (const field of LEAD_TEXT_FIELDS) {
    const fieldValue = value.lead[field];

    if (fieldValue === undefined || fieldValue === null) {
      continue;
    }

    if (typeof fieldValue !== "string") {
      return `${field} must be a string.`;
    }

    if (fieldValue.length > MAX_LEAD_FIELD_LENGTH) {
      return `${field} must be ${MAX_LEAD_FIELD_LENGTH} characters or fewer.`;
    }
  }

  return null;
}

/* =========================================================
   POST
   ========================================================= */

export async function POST(request: Request) {
  try {
    const rateLimitResponse = await applyRequestRateLimit({
      request,
      action: "public-chat",
      limit: 60,
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

    const validationError = validateRequestBody(rawBody);

    if (validationError) {
      return NextResponse.json(
        {
          error: validationError,
        },
        {
          status: 400,
        },
      );
    }

    const body = rawBody as RequestBody;

    await connectDB();

    let existingLead: any = null;

    let business;

    /* =====================================================
       EXISTING PERSISTED LEAD
       ===================================================== */

    if (body.leadId) {
      const businessSlug = body.businessSlug?.trim().toLowerCase();

      if (!businessSlug) {
        return NextResponse.json(
          {
            error: "businessSlug is required.",
          },
          {
            status: 400,
          },
        );
      }

      business = await Business.findOne({
        slug: businessSlug,
        emailVerified: true,
      });

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

      if (!body.publicAccessToken) {
        return NextResponse.json(
          {
            error: "Lead access token is required.",
          },
          {
            status: 401,
          },
        );
      }

      existingLead = await Lead.findOne({
        _id: body.leadId,
        businessId: business._id,
        publicAccessToken: body.publicAccessToken,
      });

      if (!existingLead) {
        return NextResponse.json(
          {
            error: "Lead not found.",
          },
          {
            status: 404,
          },
        );
      }
    }

    /* =====================================================
       ANONYMOUS CHAT
       ===================================================== */
    else {
      const businessSlug = body.businessSlug?.trim().toLowerCase();

      if (!businessSlug) {
        return NextResponse.json(
          {
            error: "businessSlug is required for anonymous chat.",
          },
          {
            status: 400,
          },
        );
      }

      business = await Business.findOne({
        slug: businessSlug,

        emailVerified: true,
      });

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
    }

    /* =====================================================
       AI SETTINGS
       ===================================================== */

    const aiSettings: AISettings = {
      businessDescription: business.aiSettings?.businessDescription ?? "",

      services: business.aiSettings?.services ?? [],

      serviceAreas: business.aiSettings?.serviceAreas ?? [],

      welcomeMessage: business.aiSettings?.welcomeMessage ?? "",

      tone: business.aiSettings?.tone ?? "friendly",

      qualificationFields: business.aiSettings?.qualificationFields ?? [
        "name",
        "phone",
        "service",
        "location",
        "urgency",
        "timeline",
      ],

      additionalInstructions: business.aiSettings?.additionalInstructions ?? "",
    };

    /* =====================================================
       LATEST USER MESSAGE
       ===================================================== */

    const latestUserMessage = [...body.messages]
      .reverse()
      .find((message) => message.sender === "user");

    /* =====================================================
       SAVE USER MESSAGE

       A customer reply means any previously scheduled
       follow-up is no longer needed.

       We clear nextFollowUpAt here.

       A new timer will be scheduled after the AI replies.
       ===================================================== */

    if (existingLead && latestUserMessage) {
      await Message.create({
        leadId: existingLead._id,

        sender: "lead",

        content: latestUserMessage.text,
      });

      existingLead.followUp = existingLead.followUp ?? {};

      existingLead.followUp.nextFollowUpAt = null;

      await existingLead.save();
    }

    /* =====================================================
       GENERATE AI RESPONSE
       ===================================================== */

    const result = await generateQualificationResponse(
      {
        messages: body.messages,

        lead: body.lead,
      },

      {
        name: business.name,

        industry: business.industry,

        country: business.country ?? "US",

        aiSettings,
      },
    );

    /* =====================================================
       EXISTING LEAD
       ===================================================== */

    if (existingLead) {
      existingLead.industry = result.lead.industry ?? existingLead.industry;

      existingLead.service = result.lead.service ?? existingLead.service;

      existingLead.location = result.lead.location ?? existingLead.location;

      existingLead.urgency = result.lead.urgency ?? existingLead.urgency;

      existingLead.timeline = result.lead.timeline ?? existingLead.timeline;

      existingLead.name = result.lead.name ?? existingLead.name;

      existingLead.phone = result.lead.phone ?? existingLead.phone;

      existingLead.status = result.readyToBook ? "qualified" : result.status;

      /* ===================================================
         SCHEDULE NEXT FOLLOW-UP

         Customer has just received another AI response.

         For normal customer/AI conversation we keep the
         current follow-up count and schedule based on it.

         count 0 -> 1 hour
         count 1 -> 24 hours
         count 2 -> 48 hours
         =================================================== */

      if (canFollowUp(existingLead.status, existingLead.phone)) {
        existingLead.followUp = existingLead.followUp ?? {};

        const followUpCount = existingLead.followUp.count ?? 0;

        existingLead.followUp.enabled = true;

        existingLead.followUp.nextFollowUpAt = getNextFollowUpAt(followUpCount);
      } else {
        existingLead.followUp = existingLead.followUp ?? {};

        existingLead.followUp.enabled = false;

        existingLead.followUp.nextFollowUpAt = null;
      }

      await existingLead.save();

      const aiMessage = await Message.create({
        leadId: existingLead._id,

        sender: "ai",

        content: result.reply,
      });

      return NextResponse.json({
        ...result,

        leadId: existingLead._id.toString(),

        publicAccessToken: existingLead.publicAccessToken,

        messageId: aiMessage._id.toString(),
      });
    }

    /* =====================================================
       ANONYMOUS VISITOR

       No phone:
       Do NOT create Lead.
       Do NOT create Messages.
       Do NOT schedule follow-up.
       ===================================================== */

    if (!result.lead.phone) {
      return NextResponse.json({
        ...result,

        leadId: null,

        publicAccessToken: null,

        messageId: null,
      });
    }

    /* =====================================================
       RE-VALIDATE PHONE BEFORE CREATING REAL LEAD
       ===================================================== */

    const verifiedPhone = validatePhoneNumber(result.lead.phone, business.country ?? "US");

    if (!verifiedPhone.valid || !verifiedPhone.normalized) {
      return NextResponse.json({
        ...result,

        reply: verifiedPhone.error ?? "Please enter a valid phone number.",

        lead: {
          ...result.lead,
          phone: null,
        },

        leadId: null,

        publicAccessToken: null,

        messageId: null,

        readyToBook: false,
      });
    }

    result.lead.phone = verifiedPhone.normalized;

    /* =====================================================
       PHONE CAPTURED

       NOW this becomes a real Lead.
       ===================================================== */
    const subscriptionAccess = getSubscriptionAccess(
      business.subscription,
    );

    if (
      !subscriptionAccess.hasAccess ||
      !subscriptionAccess.limits
    ) {
      return NextResponse.json(
        {
          error: "An active subscription is required.",
        },
        {
          status: 403,
        },
      );
    }

    const periodStart =
      business.subscription?.currentPeriodStart;

    const periodEnd =
      business.subscription?.currentPeriodEnd;

    if (!periodStart || !periodEnd) {
      safeLogger.error(
        "Business subscription billing period is missing.",
        undefined,
        {
          businessId: business._id.toString(),
        },
      );

      return NextResponse.json(
        {
          error:
            "Subscription billing information is temporarily unavailable.",
        },
        {
          status: 503,
        },
      );
    }

    const leadUsage = await consumeSubscriptionUsage({
      businessId: business._id,
      periodStart,
      periodEnd,
      type: "leads",
      amount: 1,
      limit: subscriptionAccess.limits.leads,
    });

    if (!leadUsage.allowed) {
      return NextResponse.json(
        {
          error: "Monthly lead limit reached.",
          code: "LEAD_LIMIT_REACHED",
          usage: {
            used: leadUsage.used,
            limit: leadUsage.limit,
            remaining: leadUsage.remaining,
          },
        },
        {
          status: 429,
        },
      );
    }

    const publicAccessToken =
      randomBytes(32).toString("base64url");

    let newLead;

    try {
      newLead = await Lead.create({
        businessId: business._id,

        publicAccessToken,

        industry: result.lead.industry ?? business.industry,

        service: result.lead.service ?? undefined,

        location: result.lead.location ?? undefined,

        urgency: result.lead.urgency ?? undefined,

        timeline: result.lead.timeline ?? undefined,

        name: result.lead.name ?? undefined,

        phone: result.lead.phone,

        status: result.readyToBook
          ? "qualified"
          : result.status,

        source: "public-lead-page",
      });
    } catch (error) {
      try {
        await releaseSubscriptionUsage({
          businessId: business._id,
          periodStart,
          periodEnd,
          type: "leads",
          amount: 1,
        });
      } catch (rollbackError) {
        safeLogger.error(
          "Failed to release reserved lead usage.",
          rollbackError,
        );
      }

      throw error;
    }

    /* =====================================================
       SCHEDULE FIRST FOLLOW-UP FOR NEW LEAD

       New persisted lead starts at count 0.

       If the customer doesn't reply:
       follow-up #1 becomes due in 1 hour.
       ===================================================== */

    if (canFollowUp(newLead.status, newLead.phone)) {
      newLead.followUp.enabled = true;

      newLead.followUp.count = 0;

      newLead.followUp.lastFollowUpAt = null;

      newLead.followUp.nextFollowUpAt = getNextFollowUpAt(0);

      await newLead.save();
    }

    /* =====================================================
       NEW LEAD EMAIL
       ===================================================== */

    try {
      const { sendNewLeadEmail } = await import("@/lib/email/send-new-lead-email");

      await sendNewLeadEmail({
        businessEmail: business.email,

        businessName: business.name,

        leadId: newLead._id.toString(),

        name: result.lead.name,

        phone: result.lead.phone,

        service: result.lead.service,

        location: result.lead.location,

        urgency: result.lead.urgency,

        timeline: result.lead.timeline,
      });
    } catch (emailError) {
      safeLogger.error("New lead email notification failed.", emailError);
    }

    /* =====================================================
       SAVE ENTIRE ANONYMOUS CONVERSATION
       ===================================================== */

    const conversationMessages = body.messages.map((message) => ({
      leadId: newLead._id,

      sender: message.sender === "user" ? "lead" : "ai",

      content: message.text,
    }));

    await Message.insertMany(conversationMessages);

    /* =====================================================
       SAVE CURRENT AI RESPONSE
       ===================================================== */

    const aiMessage = await Message.create({
      leadId: newLead._id,

      sender: "ai",

      content: result.reply,
    });

    return NextResponse.json({
      ...result,

      leadId: newLead._id.toString(),

      publicAccessToken,

      messageId: aiMessage._id.toString(),
    });
  } catch (error) {
    safeLogger.error("Chat API error.", error);

    return NextResponse.json(
      {
        error: "Unable to generate AI response.",
      },
      {
        status: 500,
      },
    );
  }
}
