import {
  Schema,
  model,
  models,
} from "mongoose";

const smsConversationLockSchema =
  new Schema(
    {
      businessId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Business",

        required:
          true,
      },

      phone: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },

      /*
       * Identifies the worker that currently owns the lock.
       *
       * null means the lock record exists but is currently
       * not owned by any worker.
       */
      ownerToken: {
        type:
          String,

        default:
          null,

        trim:
          true,
      },

      /*
       * Monotonically increasing ownership generation.
       *
       * Every NEW lock acquisition increments this number.
       *
       * Example:
       *
       * worker A -> fenceToken 1
       * worker B -> fenceToken 2
       * worker C -> fenceToken 3
       *
       * This will later allow us to reject work from an old
       * worker even if its request is still running.
       */
      fenceToken: {
        type:
          Number,

        default:
          0,

        min:
          0,

        required:
          true,
      },

      /*
       * Current lease expiration.
       *
       * The document itself is NOT deleted when this expires.
       * Another worker may atomically reclaim the lock.
       */
      expiresAt: {
        type:
          Date,

        required:
          true,
      },

      /*
       * Updated whenever the current owner successfully
       * renews its lease.
       */
      lastRenewedAt: {
        type:
          Date,

        default:
          null,
      },
    },
    {
      timestamps:
        true,

      collection:
        "smsConversationLocks",
    }
  );

/* =========================================================
   ONE LOCK RECORD PER BUSINESS + CUSTOMER PHONE
   ========================================================= */

smsConversationLockSchema.index(
  {
    businessId:
      1,

    phone:
      1,
  },
  {
    unique:
      true,

    name:
      "unique_sms_conversation_lock",
  }
);

/*
 * IMPORTANT:
 *
 * Do NOT add a TTL index to expiresAt.
 *
 * Expired lock documents intentionally stay in MongoDB so
 * fenceToken continues increasing across future owners.
 *
 * An expired lock is reclaimed atomically by the lock helper.
 */

export const SmsConversationLock =
  models.SmsConversationLock ||
  model(
    "SmsConversationLock",
    smsConversationLockSchema
  );