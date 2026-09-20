import { Schema, model, models } from "mongoose";

const twilioInboundEventSchema = new Schema(
  {
    messageSid: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    from: {
      type: String,
      required: true,
      trim: true,
    },

    to: {
      type: String,
      required: true,
      trim: true,
    },

    body: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["processing", "processed", "failed"],
      default: "processing",
      required: true,
    },

    /*
     * Unique ownership token for the worker currently
     * processing this inbound Twilio event.
     *
     * Every first claim and every stale/failed reclaim
     * gets a new random token.
     *
     * This prevents an old worker from later marking
     * another worker's event as processed/failed.
     */
    processingToken: {
      type: String,
      default: null,
      trim: true,
    },

    processedAt: {
      type: Date,
      default: null,
    },

    error: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export const TwilioInboundEvent =
  models.TwilioInboundEvent ||
  model("TwilioInboundEvent", twilioInboundEventSchema);
