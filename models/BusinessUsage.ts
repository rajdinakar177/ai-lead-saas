import { Schema, model, models, type InferSchemaType } from "mongoose";

const businessUsageSchema = new Schema(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    periodStart: {
      type: Date,
      required: true,
    },

    periodEnd: {
      type: Date,
      required: true,
    },

    leads: {
      type: Number,
      default: 0,
      min: 0,
    },

    aiConversations: {
      type: Number,
      default: 0,
      min: 0,
    },

    smsSegments: {
      type: Number,
      default: 0,
      min: 0,
    },

    appointments: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

businessUsageSchema.index(
  {
    businessId: 1,
    periodStart: 1,
    periodEnd: 1,
  },
  {
    unique: true,
  },
);

export type BusinessUsageDocument = InferSchemaType<typeof businessUsageSchema>;

export const BusinessUsage =
  models.BusinessUsage || model("BusinessUsage", businessUsageSchema);
