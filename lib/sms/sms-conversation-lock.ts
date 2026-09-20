import { randomUUID } from "crypto";

import { SmsConversationLock } from "@/models/SmsConversationLock";

type AcquireSmsConversationLockParams = {
  businessId: any;
  phone: string;
  waitMs?: number;
  leaseMs?: number;
  retryDelayMs?: number;
};

type RenewSmsConversationLockParams = {
  businessId: any;
  phone: string;
  ownerToken: string;
  fenceToken: number;
  leaseMs?: number;
};

type ReleaseSmsConversationLockParams = {
  businessId: any;
  phone: string;
  ownerToken: string;
  fenceToken: number;
};

type CheckSmsConversationLockParams = {
  businessId: any;
  phone: string;
  ownerToken: string;
  fenceToken: number;
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

/* =========================================================
   ACQUIRE LOCK
   ========================================================= */

export async function acquireSmsConversationLock({
  businessId,
  phone,
  waitMs = 15000,
  leaseMs = 120000,
  retryDelayMs = 150,
}: AcquireSmsConversationLockParams) {
  const ownerToken = randomUUID();

  const deadline = Date.now() + waitMs;

  while (Date.now() <= deadline) {
    const now = new Date();

    const expiresAt = new Date(now.getTime() + leaseMs);

    try {
      /*
       * We can acquire when:
       *
       * 1. lock is expired
       * 2. lock is currently unowned
       *
       * Every successful NEW acquisition increments
       * fenceToken.
       */
      const lock = await SmsConversationLock.findOneAndUpdate(
        {
          businessId,
          phone,

          $or: [
            {
              expiresAt: {
                $lte: now,
              },
            },
            {
              ownerToken: null,
            },
          ],
        },
        {
          $set: {
            ownerToken,
            expiresAt,
            lastRenewedAt: now,
          },

          $inc: {
            fenceToken: 1,
          },

          $setOnInsert: {
            businessId,
            phone,
          },
        },
        {
          upsert: true,
          returnDocument: "after",
        },
      ).lean();

      if (lock && lock.ownerToken === ownerToken) {
        return {
          ownerToken,

          fenceToken: lock.fenceToken,

          expiresAt: lock.expiresAt,
        };
      }
    } catch (error) {
      /*
       * Another worker currently owns the unique
       * businessId + phone lock.
       *
       * This is expected contention.
       */
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
    }

    if (Date.now() > deadline) {
      break;
    }

    await sleep(retryDelayMs);
  }

  return null;
}

/* =========================================================
   RENEW LOCK
   ========================================================= */

export async function renewSmsConversationLock({
  businessId,
  phone,
  ownerToken,
  fenceToken,
  leaseMs = 120000,
}: RenewSmsConversationLockParams) {
  const now = new Date();

  const expiresAt = new Date(now.getTime() + leaseMs);

  const lock = await SmsConversationLock.findOneAndUpdate(
    {
      businessId,
      phone,
      ownerToken,
      fenceToken,

      /*
       * Do not allow a worker to renew a lease that
       * already expired.
       *
       * Once expired, ownership must be reacquired and
       * receive a newer fenceToken.
       */
      expiresAt: {
        $gt: now,
      },
    },
    {
      $set: {
        expiresAt,
        lastRenewedAt: now,
      },
    },
    {
      returnDocument: "after",
    },
  ).lean();

  if (!lock) {
    return null;
  }

  return {
    ownerToken,
    fenceToken,
    expiresAt: lock.expiresAt,
  };
}

/* =========================================================
   CHECK OWNERSHIP
   ========================================================= */

export async function checkSmsConversationLock({
  businessId,
  phone,
  ownerToken,
  fenceToken,
}: CheckSmsConversationLockParams) {
  const now = new Date();

  const lock = await SmsConversationLock.findOne({
    businessId,
    phone,
    ownerToken,
    fenceToken,

    expiresAt: {
      $gt: now,
    },
  })
    .select("_id ownerToken fenceToken expiresAt")
    .lean();

  return Boolean(lock);
}

/* =========================================================
   RELEASE LOCK
   ========================================================= */

export async function releaseSmsConversationLock({
  businessId,
  phone,
  ownerToken,
  fenceToken,
}: ReleaseSmsConversationLockParams) {
  /*
   * Do NOT delete the document.
   *
   * Keeping it preserves fenceToken history.
   *
   * We only clear ownership if this exact owner still
   * owns this exact fence generation.
   */
  const result = await SmsConversationLock.updateOne(
    {
      businessId,
      phone,
      ownerToken,
      fenceToken,
    },
    {
      $set: {
        ownerToken: null,
        expiresAt: new Date(0),
        lastRenewedAt: null,
      },
    },
  );

  return result.modifiedCount === 1;
}
