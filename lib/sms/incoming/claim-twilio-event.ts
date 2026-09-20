import { randomUUID } from "crypto";

import { TwilioInboundEvent } from "@/models/TwilioInboundEvent";
import { isMongoDuplicateKeyError } from "@/lib/sms/incoming/helpers";

export type ClaimTwilioInboundEventResult =
  | {
      shouldProcess: true;
      processingToken: string;
    }
  | {
      shouldProcess: false;
      processingToken: null;
    };

/* =========================================================
   TWILIO EVENT CLAIM / RETRY

   - first delivery: create "processing"
   - already processed: ignore
   - currently processing: ignore duplicate
   - failed or stale processing: atomically reclaim
   ========================================================= */

export async function claimTwilioInboundEvent({
  messageSid,
  from,
  to,
  body,
}: {
  messageSid: string;
  from: string;
  to: string;
  body: string;
}): Promise<ClaimTwilioInboundEventResult> {
  const firstProcessingToken = randomUUID();

  try {
    await TwilioInboundEvent.create({
      messageSid,
      from,
      to,
      body,

      status: "processing",

      processingToken: firstProcessingToken,

      processedAt: null,

      error: null,
    });

    return {
      shouldProcess: true,

      processingToken: firstProcessingToken,
    };
  } catch (error) {
    if (!isMongoDuplicateKeyError(error)) {
      throw error;
    }
  }

  const existing = await TwilioInboundEvent.findOne({
    messageSid,
  }).lean();

  if (!existing) {
    throw new Error(
      `Twilio event ${messageSid} exists but could not be loaded.`,
    );
  }

  if (existing.status === "processed") {
    return {
      shouldProcess: false,

      processingToken: null,
    };
  }

  const staleBefore = new Date(Date.now() - 5 * 60 * 1000);

  if (
    existing.status === "processing" &&
    existing.updatedAt &&
    new Date(existing.updatedAt) > staleBefore
  ) {
    return {
      shouldProcess: false,

      processingToken: null,
    };
  }

  /*
   * Every reclaim receives a new ownership token.
   */
  const reclaimedProcessingToken = randomUUID();

  const reclaimed = await TwilioInboundEvent.findOneAndUpdate(
    {
      messageSid,

      $or: [
        {
          status: "failed",
        },
        {
          status: "processing",

          updatedAt: {
            $lte: staleBefore,
          },
        },
      ],
    },

    {
      $set: {
        status: "processing",

        processingToken: reclaimedProcessingToken,

        processedAt: null,

        error: null,

        from,
        to,
        body,
      },
    },

    {
      returnDocument: "after",
    },
  );

  if (!reclaimed) {
    /*
     * Another worker reclaimed the event before us.
     */
    return {
      shouldProcess: false,

      processingToken: null,
    };
  }

  return {
    shouldProcess: true,

    processingToken: reclaimed.processingToken,
  };
}
