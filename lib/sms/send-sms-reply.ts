import { Types } from "mongoose";

import { safeLogger } from "@/lib/security/safe-logger";
import { sendSms } from "@/lib/sms/send-sms";

import {
  reserveSmsQuota,
  releaseSmsQuota,
} from "@/lib/sms-quota";

import {
  calculateSmsSegments,
} from "@/lib/sms/sms-segments";

import {
  SmsQuotaError,
} from "@/lib/sms/sms-quota-error";

type BusinessLike = {
  _id: string | Types.ObjectId;

  subscription?: {
    plan?: "starter" | "pro" | null;
    status?: string | null;
    currentPeriodStart?: Date | null;
    currentPeriodEnd?: Date | null;
  } | null;
};

type SendSmsReplyParams = {
  business: BusinessLike;
  to: string;
  body: string;
};

type SmsMode = "mock" | "twilio";

export async function sendSmsReply({
  business,
  to,
  body,
}: SendSmsReplyParams) {
  const mode = (
    process.env.SMS_MODE ?? "mock"
  ) as SmsMode;

  /*
   * Calculate the number of segments BEFORE sending.
   */
  
  const segmentInfo =
    calculateSmsSegments(body);
safeLogger.info("Mock SMS outbound.", {
  segments: segmentInfo.segments,
  encoding: segmentInfo.encoding,
});
  if (segmentInfo.segments <= 0) {
    throw new Error(
      "Cannot send an empty SMS message.",
    );
  }

  /*
   * Atomically reserve SMS quota.
   */
  const quota = await reserveSmsQuota(
    business,
    segmentInfo.segments,
  );

  if (!quota.allowed) {
    throw new SmsQuotaError({
      reason: quota.reason,
      used: quota.used,
      limit: quota.limit,
      remaining: quota.remaining,
    });
  }

  try {
    // ----------------------------
    // MOCK MODE
    // ----------------------------

    if (mode === "mock") {
      if (process.env.NODE_ENV === "development") {
        safeLogger.info("Mock SMS outbound.", {
          segments: segmentInfo.segments,
          encoding: segmentInfo.encoding,
        });
      }

      return {
        success: true,
        mode: "mock" as const,
        sid: null,
        status: "mocked",

        segments: segmentInfo.segments,
        encoding: segmentInfo.encoding,

        usage: {
          used: quota.used,
          limit: quota.limit,
          remaining: quota.remaining,
        },
      };
    }

    // ----------------------------
    // TWILIO MODE
    // ----------------------------

    if (mode === "twilio") {
      const result = await sendSms({
        to,
        body,
      });

      return {
        ...result,

        mode: "twilio" as const,

        segments: segmentInfo.segments,
        encoding: segmentInfo.encoding,

        usage: {
          used: quota.used,
          limit: quota.limit,
          remaining: quota.remaining,
        },
      };
    }

    throw new Error(
      `Invalid SMS_MODE: ${mode}`,
    );
  } catch (error) {
    /*
     * We reserved quota before attempting delivery.
     *
     * If delivery itself fails, release that reservation.
     */
    try {
      await releaseSmsQuota(
        quota.reservation,
      );
    } catch (quotaError) {
      safeLogger.error(
        "Failed to release SMS quota after outbound SMS failure.",
        quotaError,
      );
    }

    throw error;
  }
}