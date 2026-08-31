import {
  Schema,
  model,
  models,
} from "mongoose";
export type AvailabilityDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type BusinessAvailabilityDay = {
  day: AvailabilityDay;
  enabled: boolean;
  startTime: string;
  endTime: string;
};

export type BusinessAvailability = {
  slotDurationMinutes: number;
  bufferMinutes: number;
  days: BusinessAvailabilityDay[];
};
const businessSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      default: "US",
      trim: true,
      uppercase: true,
    },

    countryCode: {
      type: String,
      default: "+1",
      trim: true,
    },

    timezone: {
      type: String,
      default: "America/Chicago",
      trim: true,
    },

    currency: {
      type: String,
      default: "USD",
      trim: true,
      uppercase: true,
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
    availability: {
      slotDurationMinutes: {
        type: Number,
        default: 60,
        min: 15,
      },

      bufferMinutes: {
        type: Number,
        default: 0,
        min: 0,
      },

      days: {
        type: [
          {
            day: {
              type: String,
              enum: [
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
                "sunday",
              ],
              required: true,
            },

            enabled: {
              type: Boolean,
              default: true,
            },

            startTime: {
              type: String,
              default: "09:00",
            },

            endTime: {
              type: String,
              default: "17:00",
            },
          },
        ],

        default: [
          {
            day: "monday",
            enabled: true,
            startTime: "09:00",
            endTime: "17:00",
          },
          {
            day: "tuesday",
            enabled: true,
            startTime: "09:00",
            endTime: "17:00",
          },
          {
            day: "wednesday",
            enabled: true,
            startTime: "09:00",
            endTime: "17:00",
          },
          {
            day: "thursday",
            enabled: true,
            startTime: "09:00",
            endTime: "17:00",
          },
          {
            day: "friday",
            enabled: true,
            startTime: "09:00",
            endTime: "17:00",
          },
          {
            day: "saturday",
            enabled: true,
            startTime: "09:00",
            endTime: "13:00",
          },
          {
            day: "sunday",
            enabled: false,
            startTime: "09:00",
            endTime: "17:00",
          },
        ],
      },
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
          "location",
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