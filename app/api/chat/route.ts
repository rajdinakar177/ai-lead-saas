
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { validatePhoneNumber } from "@/lib/phone";

import { Business } from "@/models/Business";
import { Lead } from "@/models/Lead";
import { Message } from "@/models/Message";
import {
  generateQualificationResponse,
  type AISettings,
  type ChatMessage,
  type LeadData,
} from "@/lib/ai/qualification";
/* =========================================================
   TYPES
   ========================================================= */



type RequestBody = {
  leadId?: string | null;
  businessSlug?: string;
  messages: ChatMessage[];
  lead: LeadData;
};



/* =========================================================
   POST
   ========================================================= */

export async function POST(
  request: Request
) {
  try {
    const body: RequestBody =
      await request.json();

    if (
      !Array.isArray(
        body.messages
      )
    ) {
      return NextResponse.json(
        {
          error:
            "messages are required.",
        },
        {
          status: 400,
        }
      );
    }

    await connectDB();

    let existingLead: any = null;

    let business;

    /* =====================================================
       EXISTING PERSISTED LEAD
       ===================================================== */

    if (body.leadId) {
      existingLead =
        await Lead.findById(
          body.leadId
        );

      if (!existingLead) {
        return NextResponse.json(
          {
            error:
              "Lead not found.",
          },
          {
            status: 404,
          }
        );
      }

      business =
        await Business.findById(
          existingLead.businessId
        );

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
    }

    /* =====================================================
       ANONYMOUS CHAT
       ===================================================== */

    else {
      const businessSlug =
        body.businessSlug
          ?.trim()
          .toLowerCase();

      if (!businessSlug) {
        return NextResponse.json(
          {
            error:
              "businessSlug is required for anonymous chat.",
          },
          {
            status: 400,
          }
        );
      }

      business =
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
    }

    /* =====================================================
       AI SETTINGS
       ===================================================== */

    const aiSettings: AISettings = {
      businessDescription:
        business.aiSettings
          ?.businessDescription ??
        "",

      services:
        business.aiSettings
          ?.services ??
        [],

      serviceAreas:
        business.aiSettings
          ?.serviceAreas ??
        [],

      welcomeMessage:
        business.aiSettings
          ?.welcomeMessage ??
        "",

      tone:
        business.aiSettings
          ?.tone ??
        "friendly",

      qualificationFields:
        business.aiSettings
          ?.qualificationFields ??
        [
          "name",
          "phone",
          "service",
          "location",
          "urgency",
          "timeline",
        ],

      additionalInstructions:
        business.aiSettings
          ?.additionalInstructions ??
        "",
    };

    /* =====================================================
       LATEST USER MESSAGE
       ===================================================== */

    const latestUserMessage =
      [...body.messages]
        .reverse()
        .find(
          (message) =>
            message.sender ===
            "user"
        );

    /* =====================================================
       SAVE USER MESSAGE ONLY FOR EXISTING LEAD
       ===================================================== */

    if (
      existingLead &&
      latestUserMessage
    ) {
      await Message.create({
        leadId:
          existingLead._id,

        sender:
          "lead",

        content:
          latestUserMessage.text,
      });
    }

    /* =====================================================
       GENERATE AI RESPONSE
       ===================================================== */

    const result =
      await generateQualificationResponse(
        {
          messages:
            body.messages,

          lead:
            body.lead,
        },

        {
          name:
            business.name,

          industry:
            business.industry,

          country:
            business.country ??
            "US",

          aiSettings,
        }
      );

    /* =====================================================
       EXISTING LEAD
       Update normally.
       ===================================================== */

    if (existingLead) {
      existingLead.industry =
        result.lead.industry ??
        existingLead.industry;

      existingLead.service =
        result.lead.service ??
        existingLead.service;

      existingLead.location =
        result.lead.location ??
        existingLead.location;

      existingLead.urgency =
        result.lead.urgency ??
        existingLead.urgency;

      existingLead.timeline =
        result.lead.timeline ??
        existingLead.timeline;

      existingLead.name =
        result.lead.name ??
        existingLead.name;

      existingLead.phone =
        result.lead.phone ??
        existingLead.phone;

      existingLead.status =
        result.readyToBook
          ? "qualified"
          : result.status;

      await existingLead.save();

      const aiMessage =
        await Message.create({
          leadId:
            existingLead._id,

          sender:
            "ai",

          content:
            result.reply,
        });

      return NextResponse.json({
        ...result,

        leadId:
          existingLead._id.toString(),

        messageId:
          aiMessage._id.toString(),
      });
    }

    /* =====================================================
       ANONYMOUS VISITOR

       No phone:
       Do NOT create Lead.
       Do NOT create Messages.
       ===================================================== */

    if (!result.lead.phone) {
      return NextResponse.json({
        ...result,

        leadId: null,

        messageId: null,
      });
    }
    /* =====================================================
       RE-VALIDATE PHONE BEFORE CREATING REAL LEAD
       ===================================================== */

    const verifiedPhone =
      validatePhoneNumber(
        result.lead.phone,
        business.country ?? "US"
      );

    if (
      !verifiedPhone.valid ||
      !verifiedPhone.normalized
    ) {
      return NextResponse.json(
        {
          ...result,

          reply:
            verifiedPhone.error ??
            "Please enter a valid phone number.",

          lead: {
            ...result.lead,
            phone: null,
          },

          leadId: null,

          messageId: null,

          readyToBook: false,
        }
      );
    }

    result.lead.phone =
      verifiedPhone.normalized;
    /* =====================================================
       PHONE CAPTURED

       NOW this becomes a real Lead.
       ===================================================== */

    const newLead =
      await Lead.create({
        businessId:
          business._id,

        industry:
          result.lead.industry ??
          business.industry,

        service:
          result.lead.service ??
          undefined,

        location:
          result.lead.location ??
          undefined,

        urgency:
          result.lead.urgency ??
          undefined,

        timeline:
          result.lead.timeline ??
          undefined,

        name:
          result.lead.name ??
          undefined,

        phone:
          result.lead.phone,

        status:
          result.readyToBook
            ? "qualified"
            : result.status,

        source:
          "public-lead-page",
      });
    try {
      const {
        sendNewLeadEmail,
      } = await import(
        "@/lib/email/send-new-lead-email"
      );

      await sendNewLeadEmail({
        businessEmail:
          business.email,

        businessName:
          business.name,

        leadId:
          newLead._id.toString(),

        name:
          result.lead.name,

        phone:
          result.lead.phone,

        service:
          result.lead.service,

        location:
          result.lead.location,

        urgency:
          result.lead.urgency,

        timeline:
          result.lead.timeline,
      });
    } catch (emailError) {
      console.error(
        "New lead email notification failed:",
        emailError
      );
    }
    /* =====================================================
       SAVE ENTIRE ANONYMOUS CONVERSATION

       Up until now it only existed in browser memory.
       ===================================================== */

    const conversationMessages =
      body.messages.map(
        (message) => ({
          leadId:
            newLead._id,

          sender:
            message.sender ===
              "user"
              ? "lead"
              : "ai",

          content:
            message.text,
        })
      );

    await Message.insertMany(
      conversationMessages
    );

    /* =====================================================
       SAVE CURRENT AI RESPONSE
       ===================================================== */

    const aiMessage =
      await Message.create({
        leadId:
          newLead._id,

        sender:
          "ai",

        content:
          result.reply,
      });

    return NextResponse.json({
      ...result,

      leadId:
        newLead._id.toString(),

      messageId:
        aiMessage._id.toString(),
    });
  } catch (error) {
    console.error(
      "Chat API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to generate AI response.",
      },
      {
        status: 500,
      }
    );
  }
}
