import {
  Schema,
  model,
  models,
} from "mongoose";

const sessionSchema = new Schema(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * Automatically remove expired sessions
 * from MongoDB.
 *
 * expireAfterSeconds: 0 means the document
 * expires when expiresAt is reached.
 *
 * Authentication does NOT depend on TTL
 * cleanup timing. lib/auth.ts still checks
 * expiresAt on every session lookup.
 */
sessionSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
  }
);

export const Session =
  models.Session ||
  model(
    "Session",
    sessionSchema
  );