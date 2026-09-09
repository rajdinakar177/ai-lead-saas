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

      ownerToken: {
        type:
          String,
        required:
          true,
        trim:
          true,
      },

      expiresAt: {
        type:
          Date,
        required:
          true,
      },
    },
    {
      timestamps:
        true,

      collection:
        "smsConversationLocks",
    }
  );

/*
 * Only one lock document may exist for one business + phone.
 */
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
 * Cleanup for abandoned locks.
 *
 * TTL cleanup is not used for correctness because MongoDB TTL
 * removal is asynchronous. The acquisition helper can reclaim
 * an expired lock immediately.
 */
smsConversationLockSchema.index(
  {
    expiresAt:
      1,
  },
  {
    expireAfterSeconds:
      0,

    name:
      "sms_conversation_lock_ttl",
  }
);

export const SmsConversationLock =
  models.SmsConversationLock ||
  model(
    "SmsConversationLock",
    smsConversationLockSchema
  );
