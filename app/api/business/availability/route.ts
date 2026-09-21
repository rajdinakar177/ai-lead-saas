import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { requireBusiness } from "@/lib/auth";
import { Business } from "@/models/Business";
import { validateRequestOrigin } from "@/lib/security/origin-protection";
import { safeLogger } from "@/lib/security/safe-logger";

type AvailabilityDay =
  "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

type DayAvailability = {
  day: AvailabilityDay;
  enabled: boolean;
  startTime: string;
  endTime: string;
};

type UpdateAvailabilityBody = {
  slotDurationMinutes?: number;
  bufferMinutes?: number;
  days?: DayAvailability[];
};

const validDays: AvailabilityDay[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const validSlotDurations = [30, 45, 60, 90, 120];

const validBufferMinutes = [0, 15, 30, 45, 60];

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

export async function PATCH(request: Request) {
  try {
    const originError = validateRequestOrigin(request);

    if (originError) {
      return originError;
    }
    await connectDB();

    const currentBusiness = await requireBusiness();

    const body: UpdateAvailabilityBody = await request.json();

    const slotDurationMinutes = Number(body.slotDurationMinutes);

    const bufferMinutes = Number(body.bufferMinutes);

    const days = body.days;

    /* -----------------------------------------
       VALIDATE SLOT DURATION
    ----------------------------------------- */

    if (!validSlotDurations.includes(slotDurationMinutes)) {
      return NextResponse.json(
        {
          error: "Invalid appointment duration.",
        },
        {
          status: 400,
        },
      );
    }

    /* -----------------------------------------
       VALIDATE BUFFER
    ----------------------------------------- */

    if (!validBufferMinutes.includes(bufferMinutes)) {
      return NextResponse.json(
        {
          error: "Invalid appointment buffer.",
        },
        {
          status: 400,
        },
      );
    }

    /* -----------------------------------------
       VALIDATE DAYS ARRAY
    ----------------------------------------- */

    if (!Array.isArray(days) || days.length !== 7) {
      return NextResponse.json(
        {
          error: "Availability must contain all 7 days.",
        },
        {
          status: 400,
        },
      );
    }

    /* -----------------------------------------
       VALIDATE DAY OBJECT STRUCTURE

       Do this BEFORE accessing item.day.
       This protects against malformed API
       requests such as null, numbers, etc.
    ----------------------------------------- */

    const hasInvalidDayStructure = days.some(
      (item) =>
        typeof item !== "object" ||
        item === null ||
        typeof item.day !== "string" ||
        typeof item.enabled !== "boolean" ||
        typeof item.startTime !== "string" ||
        typeof item.endTime !== "string",
    );

    if (hasInvalidDayStructure) {
      return NextResponse.json(
        {
          error: "Invalid availability data.",
        },
        {
          status: 400,
        },
      );
    }

    /* -----------------------------------------
       VALIDATE DAY NAMES
    ----------------------------------------- */

    const receivedDays = days.map((item) => item.day);

    const hasInvalidDay = receivedDays.some((day) => !validDays.includes(day));

    if (hasInvalidDay) {
      return NextResponse.json(
        {
          error: "Invalid availability day.",
        },
        {
          status: 400,
        },
      );
    }

    /* -----------------------------------------
       PREVENT DUPLICATE DAYS
    ----------------------------------------- */

    const uniqueDays = new Set(receivedDays);

    if (uniqueDays.size !== 7) {
      return NextResponse.json(
        {
          error: "Each day must appear exactly once.",
        },
        {
          status: 400,
        },
      );
    }

    /* -----------------------------------------
       VALIDATE TIMES
    ----------------------------------------- */

    for (const item of days) {
      if (!isValidTime(item.startTime) || !isValidTime(item.endTime)) {
        return NextResponse.json(
          {
            error: `Invalid time for ${item.day}.`,
          },
          {
            status: 400,
          },
        );
      }

      /*
       * Because the time format is HH:mm,
       * lexical comparison works correctly.
       *
       * Example:
       * 09:00 < 17:00
       */

      if (item.enabled && item.startTime >= item.endTime) {
        const dayName = item.day.charAt(0).toUpperCase() + item.day.slice(1);

        return NextResponse.json(
          {
            error: `${dayName}: closing time must be after opening time.`,
          },
          {
            status: 400,
          },
        );
      }
    }

    /* -----------------------------------------
       SAVE AVAILABILITY

       IMPORTANT:
       currentBusiness._id comes from the
       authenticated session.

       We do NOT accept a business ID from
       the request body.
    ----------------------------------------- */

    const business = await Business.findByIdAndUpdate(
      currentBusiness._id,
      {
        $set: {
          availability: {
            slotDurationMinutes,
            bufferMinutes,
            days,
          },
        },
      },
      {
        returnDocument: "after",
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

    /* -----------------------------------------
       RESPONSE
    ----------------------------------------- */

    return NextResponse.json({
      success: true,

      availability: business.availability,
    });
  } catch (error) {
    safeLogger.error("Update availability error.", error);

    return NextResponse.json(
      {
        error: "Unable to update availability.",
      },
      {
        status: 500,
      },
    );
  }
}
