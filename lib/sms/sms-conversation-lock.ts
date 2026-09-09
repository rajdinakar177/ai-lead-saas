import { randomUUID } from "crypto";

import { SmsConversationLock } from "@/models/SmsConversationLock";

type AcquireSmsConversationLockParams = {
  businessId: any;
  phone: string;
  waitMs?: number;
  leaseMs?: number;
  retryDelayMs?: number;
};

type ReleaseSmsConversationLockParams = {
  businessId: any;
  phone: string;
  ownerToken: string;
};

function sleep(ms: number) {
  return new Promise<void>(
    (resolve) => {
      setTimeout(
        resolve,
        ms
      );
    }
  );
}

function isDuplicateKeyError(
  error: unknown
) {
  return (
    typeof error ===
      "object" &&
    error !==
      null &&
    "code" in
      error &&
    (
      error as {
        code?: number;
      }
    ).code ===
      11000
  );
}

export async function acquireSmsConversationLock({
  businessId,
  phone,
  waitMs = 15000,
  leaseMs = 120000,
  retryDelayMs = 150,
}: AcquireSmsConversationLockParams) {
  const ownerToken =
    randomUUID();

  const deadline =
    Date.now() +
    waitMs;

  while (
    Date.now() <=
    deadline
  ) {
    const now =
      new Date();

    const expiresAt =
      new Date(
        now.getTime() +
          leaseMs
      );

    try {
      const lock =
        await SmsConversationLock.findOneAndUpdate(
          {
            businessId,
            phone,

            $or: [
              {
                expiresAt: {
                  $lte:
                    now,
                },
              },
              {
                ownerToken,
              },
            ],
          },
          {
            $set: {
              ownerToken,
              expiresAt,
            },

            $setOnInsert: {
              businessId,
              phone,
            },
          },
          {
            upsert:
              true,

            returnDocument:
              "after",
          }
        ).lean();

      if (
        lock?.ownerToken ===
        ownerToken
      ) {
        return {
          ownerToken,
          expiresAt,
        };
      }
    } catch (error) {
      /*
       * An unexpired lock already exists. Because business +
       * phone is unique, our attempted upsert receives 11000.
       * That is normal contention, not an application error.
       */
      if (
        !isDuplicateKeyError(
          error
        )
      ) {
        throw error;
      }
    }

    if (
      Date.now() >
      deadline
    ) {
      break;
    }

    await sleep(
      retryDelayMs
    );
  }

  return null;
}

export async function releaseSmsConversationLock({
  businessId,
  phone,
  ownerToken,
}: ReleaseSmsConversationLockParams) {
  await SmsConversationLock.deleteOne({
    businessId,
    phone,
    ownerToken,
  });
}
