import { Types } from "mongoose";

import { BusinessUsage } from "@/models/BusinessUsage";
import type { SubscriptionPlanLimits } from "@/lib/subscription-plans";

export type UsageType = keyof SubscriptionPlanLimits;

type ConsumeUsageParams = {
  businessId: string | Types.ObjectId;
  periodStart: Date;
  periodEnd: Date;
  type: UsageType;
  amount?: number;
  limit: number;
};

type ConsumeUsageResult = {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
};
type ReleaseUsageParams = {
  businessId: string | Types.ObjectId;
  periodStart: Date;
  periodEnd: Date;
  type: UsageType;
  amount?: number;
};

export async function consumeSubscriptionUsage({
  businessId,
  periodStart,
  periodEnd,
  type,
  amount = 1,
  limit,
}: ConsumeUsageParams): Promise<ConsumeUsageResult> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(
      "Usage amount must be a positive integer.",
    );
  }

  if (!Number.isInteger(limit) || limit < 0) {
    throw new Error(
      "Usage limit must be a non-negative integer.",
    );
  }

  /*
   * An individual request larger than the entire
   * plan allowance can never be accepted.
   */
  if (amount > limit) {
    return {
      allowed: false,
      used: 0,
      limit,
      remaining: limit,
    };
  }

  /*
   * Make sure the usage document exists first.
   *
   * We intentionally do this separately from the
   * conditional increment. Using upsert together with
   * the limit condition can cause duplicate-key errors
   * when the document exists but the limit is exceeded.
   */
  await BusinessUsage.updateOne(
    {
      businessId,
      periodStart,
      periodEnd,
    },
    {
      $setOnInsert: {
        businessId,
        periodStart,
        periodEnd,
      },
    },
    {
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  /*
   * Atomically increment only when enough usage
   * remains for the requested amount.
   *
   * MongoDB performs the condition and increment as
   * one operation, preventing concurrent requests from
   * independently consuming the same remaining quota.
   */
  const usage = await BusinessUsage.findOneAndUpdate(
    {
      businessId,
      periodStart,
      periodEnd,

      [type]: {
        $lte: limit - amount,
      },
    },
    {
      $inc: {
        [type]: amount,
      },
    },
    {
      returnDocument: "after",
    },
  );

  if (!usage) {
    const existingUsage = await BusinessUsage.findOne({
      businessId,
      periodStart,
      periodEnd,
    }).lean();

    const used =
      typeof existingUsage?.[type] === "number"
        ? existingUsage[type]
        : 0;

    return {
      allowed: false,
      used,
      limit,
      remaining: Math.max(0, limit - used),
    };
  }

  const used =
    typeof usage[type] === "number"
      ? usage[type]
      : 0;

  return {
    allowed: true,
    used,
    limit,
    remaining: Math.max(0, limit - used),
  };
}



export async function releaseSubscriptionUsage({
  businessId,
  periodStart,
  periodEnd,
  type,
  amount = 1,
}: ReleaseUsageParams): Promise<void> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(
      "Usage amount must be a positive integer.",
    );
  }

  await BusinessUsage.updateOne(
    {
      businessId,
      periodStart,
      periodEnd,

      [type]: {
        $gte: amount,
      },
    },
    {
      $inc: {
        [type]: -amount,
      },
    },
  );
}