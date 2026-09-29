import { Types } from "mongoose";

import { getSubscriptionAccess } from "@/lib/subscription-access";

import {
  consumeSubscriptionUsage,
  releaseSubscriptionUsage,
} from "@/lib/subscription-usage";

type BusinessLike = {
  _id: string | Types.ObjectId;

  subscription?: {
    plan?: "starter" | "pro" | null;
    status?: string | null;
    currentPeriodStart?: Date | null;
    currentPeriodEnd?: Date | null;
  } | null;
};

export type SmsQuotaReservation = {
  businessId: string | Types.ObjectId;
  periodStart: Date;
  periodEnd: Date;
  segments: number;
};

export type ReserveSmsQuotaResult =
  | {
      allowed: true;
      reservation: SmsQuotaReservation;
      used: number;
      limit: number;
      remaining: number;
    }
  | {
      allowed: false;
      reason:
        "subscription_required" | "billing_period_missing" | "limit_reached";
      used?: number;
      limit?: number;
      remaining?: number;
    };

export async function reserveSmsQuota(
  business: BusinessLike,
  segments: number,
): Promise<ReserveSmsQuotaResult> {
  if (!Number.isInteger(segments) || segments <= 0) {
    throw new Error("SMS segment amount must be a positive integer.");
  }

  const access = getSubscriptionAccess(business.subscription);

  if (!access.hasAccess || !access.limits) {
    return {
      allowed: false,
      reason: "subscription_required",
    };
  }

  const periodStart = business.subscription?.currentPeriodStart;

  const periodEnd = business.subscription?.currentPeriodEnd;

  if (!periodStart || !periodEnd) {
    return {
      allowed: false,
      reason: "billing_period_missing",
    };
  }

  if (periodEnd.getTime() <= periodStart.getTime()) {
    return {
      allowed: false,
      reason: "billing_period_missing",
    };
  }

  const usage = await consumeSubscriptionUsage({
    businessId: business._id,
    periodStart,
    periodEnd,
    type: "smsSegments",
    amount: segments,
    limit: access.limits.smsSegments,
  });

  if (!usage.allowed) {
    return {
      allowed: false,
      reason: "limit_reached",
      used: usage.used,
      limit: usage.limit,
      remaining: usage.remaining,
    };
  }

  return {
    allowed: true,

    reservation: {
      businessId: business._id,
      periodStart,
      periodEnd,
      segments,
    },

    used: usage.used,
    limit: usage.limit,
    remaining: usage.remaining,
  };
}

export async function releaseSmsQuota(
  reservation: SmsQuotaReservation,
): Promise<void> {
  await releaseSubscriptionUsage({
    businessId: reservation.businessId,
    periodStart: reservation.periodStart,
    periodEnd: reservation.periodEnd,
    type: "smsSegments",
    amount: reservation.segments,
  });
}
