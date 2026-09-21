import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentBusiness } from "@/lib/auth";
import { Business } from "@/models/Business";
import { validateRequestOrigin } from "@/lib/security/origin-protection";
import { safeLogger } from "@/lib/security/safe-logger";
const allowedTones = ["friendly", "professional", "casual"] as const;

const allowedQualificationFields = [
  "name",
  "phone",
  "service",
  "location",
  "urgency",
  "timeline",
] as const;
const MAX_BUSINESS_DESCRIPTION_LENGTH = 2000;
const MAX_WELCOME_MESSAGE_LENGTH = 500;
const MAX_ADDITIONAL_INSTRUCTIONS_LENGTH = 3000;

const MAX_SERVICES = 50;
const MAX_SERVICE_AREAS = 100;
const MAX_ARRAY_ITEM_LENGTH = 100;
type Tone = (typeof allowedTones)[number];

type QualificationField = (typeof allowedQualificationFields)[number];

type RequestBody = {
  businessDescription?: string;
  services?: string[];
  serviceAreas?: string[];
  welcomeMessage?: string;
  tone?: Tone;
  qualificationFields?: QualificationField[];
  additionalInstructions?: string;
};

export async function PATCH(request: Request) {
  try {
    const originError = validateRequestOrigin(request);

    if (originError) {
      return originError;
    }
    const business = await getCurrentBusiness();

    if (!business) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        {
          status: 401,
        },
      );
    }

    const body: RequestBody = await request.json();
    const businessDescription = body.businessDescription?.trim() ?? "";

    const welcomeMessage = body.welcomeMessage?.trim() ?? "";

    const additionalInstructions = body.additionalInstructions?.trim() ?? "";

    if (businessDescription.length > MAX_BUSINESS_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        {
          error: "Business description cannot exceed 2000 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (welcomeMessage.length > MAX_WELCOME_MESSAGE_LENGTH) {
      return NextResponse.json(
        {
          error: "Welcome message cannot exceed 500 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (additionalInstructions.length > MAX_ADDITIONAL_INSTRUCTIONS_LENGTH) {
      return NextResponse.json(
        {
          error: "Additional instructions cannot exceed 3000 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (Array.isArray(body.services) && body.services.length > MAX_SERVICES) {
      return NextResponse.json(
        {
          error: "You can configure up to 50 services.",
        },
        {
          status: 400,
        },
      );
    }

    if (Array.isArray(body.serviceAreas) && body.serviceAreas.length > MAX_SERVICE_AREAS) {
      return NextResponse.json(
        {
          error: "You can configure up to 100 service areas.",
        },
        {
          status: 400,
        },
      );
    }
    await connectDB();

    const tone = allowedTones.includes(body.tone as Tone) ? body.tone : "friendly";

    const qualificationFields = Array.isArray(body.qualificationFields)
      ? body.qualificationFields.filter((field): field is QualificationField =>
        allowedQualificationFields.includes(field as QualificationField),
      )
      : [];

    const services = cleanStringArray(body.services, MAX_ARRAY_ITEM_LENGTH);

    const serviceAreas = cleanStringArray(body.serviceAreas, MAX_ARRAY_ITEM_LENGTH);

    const updatedBusiness = await Business.findByIdAndUpdate(
      business._id,
      {
        $set: {
          "aiSettings.businessDescription": businessDescription,

          "aiSettings.services": services,

          "aiSettings.serviceAreas": serviceAreas,

          "aiSettings.welcomeMessage": welcomeMessage,
          "aiSettings.tone": tone,

          "aiSettings.qualificationFields": qualificationFields,

          "aiSettings.additionalInstructions": additionalInstructions,
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      },
    );

    if (!updatedBusiness) {
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

      message: "AI settings saved successfully.",

      aiSettings: updatedBusiness.aiSettings,
    });
  } catch (error) {
    safeLogger.error("Update AI settings error.", error);

    return NextResponse.json(
      {
        error: "Unable to save AI settings.",
      },
      {
        status: 500,
      },
    );
  }
}

function cleanStringArray(values: string[] | undefined, maxItemLength: number) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [
    ...new Set(
      values
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => value.length > 0 && value.length <= maxItemLength),
    ),
  ];
}
