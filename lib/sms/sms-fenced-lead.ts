import type { ClientSession } from "mongoose";

import { Lead } from "@/models/Lead";

type FencedLeadUpdateParams = {
  leadId: any;
  businessId: any;
  phone: string;
  fenceToken: number;
  set?: Record<string, unknown>;
  unset?: Record<string, unknown>;

  /*
   * Optional MongoDB session.
   *
   * When supplied, the fenced Lead update participates in
   * the caller's transaction.
   */
  session?: ClientSession | null;
};

type FencedLeadFindOneAndUpdateParams = {
  filter: Record<string, unknown>;
  fenceToken: number;
  set?: Record<string, unknown>;
  unset?: Record<string, unknown>;

  /*
   * Optional transaction session.
   */
  session?: ClientSession | null;
};

/**
 * Filter that rejects a worker when a newer SMS worker has
 * already written to the Lead.
 *
 * Examples:
 *
 * Lead smsFenceToken = 5
 *
 * Worker 5 -> allowed
 * Worker 6 -> allowed
 * Worker 4 -> rejected
 *
 * $exists:false is included for old Lead documents created
 * before smsFenceToken was added to the schema.
 */
export function buildSmsFenceFilter(
  fenceToken: number
) {
  return {
    $or: [
      {
        smsFenceToken: {
          $lte:
            fenceToken,
        },
      },
      {
        smsFenceToken: {
          $exists:
            false,
        },
      },
    ],
  };
}

/**
 * Atomically update one known Lead while enforcing the
 * fencing generation.
 *
 * When session is supplied, this update becomes part of the
 * caller's MongoDB transaction.
 */
export async function updateLeadWithSmsFence({
  leadId,
  businessId,
  phone,
  fenceToken,
  set = {},
  unset = {},
  session = null,
}: FencedLeadUpdateParams) {
  const update: Record<
    string,
    unknown
  > = {
    $set: {
      ...set,

      smsFenceToken:
        fenceToken,
    },
  };

  if (
    Object.keys(
      unset
    ).length > 0
  ) {
    update.$unset =
      unset;
  }

  const lead =
    await Lead.findOneAndUpdate(
      {
        _id:
          leadId,

        businessId,

        phone,

        ...buildSmsFenceFilter(
          fenceToken
        ),
      },

      update,

      {
        returnDocument:
          "after",

        ...(session
          ? {
              session,
            }
          : {}),
      }
    );

  return lead;
}

/**
 * Same fencing protection, but allows additional conditions
 * such as:
 *
 * smsConversationActive: true
 * status: { $in: [...] }
 *
 * Supports an optional transaction session.
 */
export async function findOneAndUpdateLeadWithSmsFence({
  filter,
  fenceToken,
  set = {},
  unset = {},
  session = null,
}: FencedLeadFindOneAndUpdateParams) {
  const update: Record<
    string,
    unknown
  > = {
    $set: {
      ...set,

      smsFenceToken:
        fenceToken,
    },
  };

  if (
    Object.keys(
      unset
    ).length > 0
  ) {
    update.$unset =
      unset;
  }

  const lead =
    await Lead.findOneAndUpdate(
      {
        ...filter,

        ...buildSmsFenceFilter(
          fenceToken
        ),
      },

      update,

      {
        returnDocument:
          "after",

        ...(session
          ? {
              session,
            }
          : {}),
      }
    );

  return lead;
}