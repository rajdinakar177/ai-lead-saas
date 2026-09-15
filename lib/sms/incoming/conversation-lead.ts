import {
  findOneAndUpdateLeadWithSmsFence,
} from "@/lib/sms/sms-fenced-lead";

import { Lead } from "@/models/Lead";

import {
  ACTIVE_LEAD_STATUSES,
  isMongoDuplicateKeyError,
} from "@/lib/sms/incoming/helpers";

/* =========================================================
   RESTORE PREVIOUS SMS CONVERSATION

   Used when an explicit service switch deactivated the
   current lead but could not activate/create the target.
   ========================================================= */

export async function restorePreviousSmsConversation({
  leadId,
  businessId,
  phone,
  fenceToken,
}: {
  leadId: any;
  businessId: any;
  phone: string;
  fenceToken: number;
}) {
  try {
    const restored =
      await findOneAndUpdateLeadWithSmsFence({
        filter: {
          _id: leadId,

          businessId,

          phone,

          status: {
            $in:
              ACTIVE_LEAD_STATUSES,
          },
        },

        fenceToken,

        set: {
          smsConversationActive:
            true,
        },
      });

    if (!restored) {
      console.warn(
        "Previous SMS conversation was not restored because a newer fence exists.",
        {
          leadId:
            leadId.toString(),

          phone,

          fenceToken,
        }
      );
    }
  } catch (error) {
    console.error(
      "Failed to restore previous SMS conversation:",
      {
        leadId:
          leadId.toString(),

        phone,

        error,
      }
    );
  }
}

/* =========================================================
   ATOMIC SMS CONVERSATION ACTIVATION

   MongoDB's unique partial index guarantees that only one
   lead for the same business + phone can have:

   smsConversationActive = true

   If another webhook wins the race, MongoDB throws 11000.
   We catch that and load the winning conversation instead.
   ========================================================= */

export async function activateSmsConversation({
  targetLeadId,
  businessId,
  phone,
  fenceToken,
}: {
  targetLeadId: any;
  businessId: any;
  phone: string;
  fenceToken: number;
}) {
  try {
    const activatedLead =
      await findOneAndUpdateLeadWithSmsFence({
        filter: {
          _id:
            targetLeadId,

          businessId,

          phone,

          status: {
            $in:
              ACTIVE_LEAD_STATUSES,
          },
        },

        fenceToken,

        set: {
          smsConversationActive:
            true,
        },
      });

    if (activatedLead) {
      return {
        lead:
          activatedLead,

        requestedLeadActivated:
          true,
      };
    }
  } catch (error) {
    if (
      !isMongoDuplicateKeyError(
        error
      )
    ) {
      throw error;
    }

    console.log(
      "Active SMS conversation duplicate-key race detected:",
      {
        targetLeadId:
          targetLeadId.toString(),

        phone,
      }
    );
  }

  /*
   * Either:
   *
   * 1. another worker activated a lead first, or
   * 2. the requested lead changed state before activation.
   *
   * Load the current database winner.
   */

  const activeLead =
    await Lead.findOne({
      businessId,

      phone,

      smsConversationActive:
        true,
    }).sort({
      updatedAt:
        -1,
    });

  if (!activeLead) {
    return null;
  }

  return {
    lead:
      activeLead,

    requestedLeadActivated:
      activeLead._id.toString() ===
      targetLeadId.toString(),
  };
}