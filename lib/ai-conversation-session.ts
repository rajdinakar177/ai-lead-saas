import { randomBytes } from "crypto";
import { Types } from "mongoose";

import { AIConversation } from "@/models/AIConversation";
import {
  reserveAiConversationQuota,
  releaseAiConversationQuota,
} from "@/lib/ai-conversation-quota";

type BusinessLike = {
  _id: string | Types.ObjectId;

  subscription?: {
    plan?: "starter" | "pro" | null;
    status?: string | null;
    currentPeriodStart?: Date | null;
    currentPeriodEnd?: Date | null;
  } | null;
};

type GetAiConversationSessionParams = {
  business: BusinessLike;
  conversationToken?: string | null;
};

export type AiConversationSessionResult =
  | {
      allowed: true;
      conversationId: string;
      conversationToken: string;
      newlyCounted: boolean;
    }
  | {
      allowed: false;
      reason:
        | "subscription_required"
        | "billing_period_missing"
        | "limit_reached"
        | "invalid_conversation";
      used?: number;
      limit?: number;
      remaining?: number;
    };

export async function getOrCreateAiConversationSession({
  business,
  conversationToken,
}: GetAiConversationSessionParams): Promise<AiConversationSessionResult> {
  const periodStart = business.subscription?.currentPeriodStart;

  const periodEnd = business.subscription?.currentPeriodEnd;

  /*
   * =====================================================
   * EXISTING CONVERSATION TOKEN
   * =====================================================
   */

  if (conversationToken) {
    const conversation = await AIConversation.findOne({
      businessId: business._id,
      publicToken: conversationToken,
    });

    if (!conversation) {
      return {
        allowed: false,
        reason: "invalid_conversation",
      };
    }

    /*
     * If this conversation was already counted during
     * the current billing period, nothing else needs
     * to be consumed.
     */
    if (
      periodStart &&
      periodEnd &&
      conversation.countedPeriodStart?.getTime() === periodStart.getTime() &&
      conversation.countedPeriodEnd?.getTime() === periodEnd.getTime()
    ) {
      return {
        allowed: true,
        conversationId: conversation._id.toString(),
        conversationToken: conversation.publicToken,
        newlyCounted: false,
      };
    }

    /*
     * The conversation exists, but the business has
     * entered another Stripe billing period.
     *
     * Count this conversation once for the new period.
     */
    const quota = await reserveAiConversationQuota(business);

    if (!quota.allowed) {
      return {
        allowed: false,
        reason: quota.reason,
        used: quota.used,
        limit: quota.limit,
        remaining: quota.remaining,
      };
    }

    try {
      conversation.countedPeriodStart = quota.reservation.periodStart;

      conversation.countedPeriodEnd = quota.reservation.periodEnd;

      await conversation.save();
    } catch (error) {
      try {
        await releaseAiConversationQuota(quota.reservation);
      } catch {
        /*
         * Preserve the original database error.
         * The caller will log the main failure.
         */
      }

      throw error;
    }

    return {
      allowed: true,
      conversationId: conversation._id.toString(),
      conversationToken: conversation.publicToken,
      newlyCounted: true,
    };
  }

  /*
   * =====================================================
   * NEW CONVERSATION
   * =====================================================
   */

  const quota = await reserveAiConversationQuota(business);

  if (!quota.allowed) {
    return {
      allowed: false,
      reason: quota.reason,
      used: quota.used,
      limit: quota.limit,
      remaining: quota.remaining,
    };
  }

  const publicToken = randomBytes(32).toString("base64url");

  try {
    const conversation = await AIConversation.create({
      businessId: business._id,

      publicToken,

      leadId: null,

      countedPeriodStart: quota.reservation.periodStart,

      countedPeriodEnd: quota.reservation.periodEnd,
    });

    return {
      allowed: true,
      conversationId: conversation._id.toString(),
      conversationToken: conversation.publicToken,
      newlyCounted: true,
    };
  } catch (error) {
    /*
     * AI quota was reserved but the conversation
     * document was not created.
     *
     * Give the quota unit back.
     */
    try {
      await releaseAiConversationQuota(quota.reservation);
    } catch {
      /*
       * Preserve the original database error.
       */
    }

    throw error;
  }
}
