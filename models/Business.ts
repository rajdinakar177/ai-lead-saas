import {
  Schema,
  model,
  models,
} from "mongoose";

const businessSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    industry: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationTokenHash: {
      type: String,
      default: null,
    },

    emailVerificationExpiresAt: {
      type: Date,
      default: null,
    },
    aiSettings: {
      businessDescription: {
        type: String,
        default: "",
        trim: true,
      },

      services: {
        type: [String],
        default: [],
      },

      serviceAreas: {
        type: [String],
        default: [],
      },

      welcomeMessage: {
        type: String,
        default: "",
        trim: true,
      },

      tone: {
        type: String,
        enum: [
          "friendly",
          "professional",
          "casual",
        ],
        default: "friendly",
      },

      qualificationFields: {
        type: [String],
        default: [
          "name",
          "phone",
          "service",
          "urgency",
          "timeline",
        ],
      },

      additionalInstructions: {
        type: String,
        default: "",
        trim: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

export const Business =
  models.Business ||
  model("Business", businessSchema);