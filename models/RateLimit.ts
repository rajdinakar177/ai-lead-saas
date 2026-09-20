import { Schema, model, models } from "mongoose";

const rateLimitSchema = new Schema(
  {
    /*
     * Unique identifier for one
     * rate-limit bucket.
     *
     * Example:
     * login:192.168.1.10
     */
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    count: {
      type: Number,
      required: true,
      default: 0,
    },

    /*
     * Beginning of the current
     * rate-limit window.
     */
    windowStartedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    /*
     * MongoDB automatically removes
     * the record after this time.
     */
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

/*
 * TTL cleanup.
 *
 * This is only database cleanup.
 * Our rate limiter will calculate
 * whether a request is allowed itself.
 */
rateLimitSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
  },
);

export const RateLimit =
  models.RateLimit || model("RateLimit", rateLimitSchema);
