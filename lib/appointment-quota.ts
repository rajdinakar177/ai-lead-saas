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

export type AppointmentQuotaReservation = {
  businessId: string | Types.ObjectId;
  periodStart: Date;
  periodEnd: Date;
};

export type ReserveAppointmentQuotaResult =
  | {
      allowed: true;
      reservation: AppointmentQuotaReservation;
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

export async function reserveAppointmentQuota(
  business: BusinessLike,
): Promise<ReserveAppointmentQuotaResult> {
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

  const usage = await consumeSubscriptionUsage({
    businessId: business._id,
    periodStart,
    periodEnd,
    type: "appointments",
    amount: 1,
    limit: access.limits.appointments,
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
    },

    used: usage.used,
    limit: usage.limit,
    remaining: usage.remaining,
  };
}

export async function releaseAppointmentQuota(
  reservation: AppointmentQuotaReservation,
): Promise<void> {
  await releaseSubscriptionUsage({
    businessId: reservation.businessId,
    periodStart: reservation.periodStart,
    periodEnd: reservation.periodEnd,
    type: "appointments",
    amount: 1,
  });
}
