import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { requireBusiness } from "@/lib/auth";
import { Business } from "@/models/Business";

const allowedTones = [
  "friendly",
  "professional",
  "casual",
] as const;

const allowedQualificationFields = [
  "name",
  "phone",
  "service",
  "location",
  "urgency",
  "timeline",
] as const;

type Tone =
  (typeof allowedTones)[number];

type QualificationField =
  (typeof allowedQualificationFields)[number];

type RequestBody = {
  businessDescription?: string;
  services?: string[];
  serviceAreas?: string[];
  welcomeMessage?: string;
  tone?: Tone;
  qualificationFields?: QualificationField[];
  additionalInstructions?: string;
};

export async function PATCH(
  request: Request
) {
  try {
    const business =
      await requireBusiness();

    const body: RequestBody =
      await request.json();

    await connectDB();

    const tone =
      allowedTones.includes(
        body.tone as Tone
      )
        ? body.tone
        : "friendly";

    const qualificationFields =
      Array.isArray(
        body.qualificationFields
      )
        ? body.qualificationFields.filter(
          (
            field
          ): field is QualificationField =>
            allowedQualificationFields.includes(
              field as QualificationField
            )
        )
        : [];

    const services =
      cleanStringArray(
        body.services
      );

    const serviceAreas =
      cleanStringArray(
        body.serviceAreas
      );

    const updatedBusiness =
      await Business.findByIdAndUpdate(
        business._id,
        {
          $set: {
            "aiSettings.businessDescription":
              body.businessDescription?.trim() ??
              "",

            "aiSettings.services":
              services,

            "aiSettings.serviceAreas":
              serviceAreas,

            "aiSettings.welcomeMessage":
              body.welcomeMessage?.trim() ??
              "",

            "aiSettings.tone":
              tone,

            "aiSettings.qualificationFields":
              qualificationFields,

            "aiSettings.additionalInstructions":
              body.additionalInstructions?.trim() ??
              "",
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!updatedBusiness) {
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

    return NextResponse.json({
      success: true,

      message:
        "AI settings saved successfully.",

      aiSettings:
        updatedBusiness.aiSettings,
    });
  } catch (error) {
    console.error(
      "Update AI settings error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to save AI settings.",
      },
      {
        status: 500,
      }
    );
  }
}

function cleanStringArray(
  values?: string[]
) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [
    ...new Set(
      values
        .map((value) =>
          value.trim()
        )
        .filter(Boolean)
    ),
  ];
}