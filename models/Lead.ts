import mongoose, {
  Schema,
  model,
  models,
} from "mongoose";

const leadSchema = new Schema(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    name: {
      type: String,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    industry: {
      type: String,
      trim: true,
    },

    service: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      default: null,
      trim: true,
    },
    urgency: {
      type: String,
      trim: true,
    },

    timeline: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "new",
        "warm",
        "hot",
        "qualified",
        "booked",
        "won",
        "lost",
      ],
      default: "new",
    },

    source: {
      type: String,
      default: "website",
    },
    smsConversationActive: {
      type: Boolean,
      default: false,
      index: true,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const Lead =
  models.Lead ||
  model("Lead", leadSchema);