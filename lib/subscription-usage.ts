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

function isMongoDuplicateKeyError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }

  return (error as { code?: unknown }).code === 11000;
}

export async function consumeSubscriptionUsage({
  businessId,
  periodStart,
  periodEnd,
  type,
  amount = 1,
  limit,
}: ConsumeUsageParams): Promise<ConsumeUsageResult> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Usage amount must be a positive integer.");
  }

  if (!Number.isInteger(limit) || limit < 0) {
    throw new Error("Usage limit must be a non-negative integer.");
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
   * This is intentionally separate from the
   * conditional quota increment.
   *
   * Two concurrent requests may both observe that
   * the usage document does not exist and attempt
   * the initial upsert.
   *
   * The unique business + billing-period index
   * guarantees only one document can be created.
   * If the other request wins that race, MongoDB
   * may return E11000 here. That is safe to ignore
   * because the required usage document now exists.
   */
  try {
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
  } catch (error) {
    if (!isMongoDuplicateKeyError(error)) {
      throw error;
    }
  }

  /*
   * Atomically increment only when enough usage
   * remains for the requested amount.
   *
   * MongoDB evaluates the quota condition and
   * increment as one operation.
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

  /*
   * No document matched the conditional increment.
   * Normally this means the quota has been reached.
   */
  if (!usage) {
    const existingUsage = await BusinessUsage.findOne({
      businessId,
      periodStart,
      periodEnd,
    }).lean();

    /*
     * The usage document should exist because of the
     * initialization step above.
     *
     * If it does not, something unexpected happened.
     * Fail closed instead of reporting zero usage and
     * potentially allowing inconsistent accounting.
     */
    if (!existingUsage) {
      throw new Error("Subscription usage record could not be loaded.");
    }

    const used =
      typeof existingUsage[type] === "number" ? existingUsage[type] : 0;

    return {
      allowed: false,
      used,
      limit,
      remaining: Math.max(0, limit - used),
    };
  }

  const used = typeof usage[type] === "number" ? usage[type] : 0;

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
    throw new Error("Usage amount must be a positive integer.");
  }

  /*
   * Only decrement when at least the requested
   * amount is currently reserved/consumed.
   *
   * This prevents usage counters from becoming
   * negative.
   */
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
