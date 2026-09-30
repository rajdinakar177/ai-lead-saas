import { Types } from "mongoose";

import { safeLogger } from "@/lib/security/safe-logger";
import { sendSms } from "@/lib/sms/send-sms";
import { Business } from "@/models/Business";

import { reserveSmsQuota, releaseSmsQuota } from "@/lib/sms-quota";

import { calculateSmsSegments } from "@/lib/sms/sms-segments";

import { SmsQuotaError } from "@/lib/sms/sms-quota-error";

type BusinessLike = {
  _id: string | Types.ObjectId;

  twilioPhoneNumber?: string | null;

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

export async function sendSmsReply({ business, to, body }: SendSmsReplyParams) {
  const mode = (process.env.SMS_MODE ?? "mock") as SmsMode;
  if (mode !== "mock" && mode !== "twilio") {
    throw new Error(`Invalid SMS_MODE: ${mode}`);
  }

  let from: string | undefined;
  let quotaBusiness = business;
  if (mode === "twilio") {
    // Re-read setup so stale cron/webhook objects cannot send while setup is pending.
    const sender = await Business.findById(business._id)
      .select("twilioPhoneNumber twilioSmsStatus subscription")
      .lean();
    if (!sender?.twilioPhoneNumber || sender.twilioSmsStatus !== "ready") {
      throw new Error(
        "SMS setup is pending. Activate this business's registered number first.",
      );
    }
    from = sender.twilioPhoneNumber;
    quotaBusiness = { ...business, subscription: sender.subscription };
  }
  /*
   * Calculate the number of segments BEFORE sending.
   */

  const segmentInfo = calculateSmsSegments(body);
  if (segmentInfo.segments <= 0) {
    throw new Error("Cannot send an empty SMS message.");
  }

  /*
   * Atomically reserve SMS quota.
   */
  const quota = await reserveSmsQuota(quotaBusiness, segmentInfo.segments);

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
        from: from!,
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

    throw new Error(`Invalid SMS_MODE: ${mode}`);
  } catch (error) {
    /*
     * We reserved quota before attempting delivery.
     *
     * If delivery itself fails, release that reservation.
     */
    try {
      await releaseSmsQuota(quota.reservation);
    } catch (quotaError) {
      safeLogger.error(
        "Failed to release SMS quota after outbound SMS failure.",
        quotaError,
      );
    }

    throw error;
  }
}
