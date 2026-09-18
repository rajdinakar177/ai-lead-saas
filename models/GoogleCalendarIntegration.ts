import {
  Schema,
  model,
  models,
} from "mongoose";

const googleCalendarIntegrationSchema =
  new Schema(
    {
      businessId: {
        type: Schema.Types.ObjectId,
        ref: "Business",
        required: true,
        unique: true,
        index: true,
      },

      googleEmail: {
        type: String,
        trim: true,
        lowercase: true,
        default: null,
      },

      calendarId: {
        type: String,
        trim: true,
        default: "primary",
      },

      accessToken: {
        type: String,
        default: null,
      },

      refreshToken: {
        type: String,
        default: null,
      },

      expiryDate: {
        type: Date,
        default: null,
      },

      scope: {
        type: String,
        default: null,
      },

      tokenType: {
        type: String,
        default: null,
      },

      connected: {
        type: Boolean,
        default: false,
        index: true,
      },

      connectedAt: {
        type: Date,
        default: null,
      },

      lastSyncedAt: {
        type: Date,
        default: null,
      },

      lastSyncError: {
        type: String,
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

export const GoogleCalendarIntegration =
  models.GoogleCalendarIntegration ||
  model(
    "GoogleCalendarIntegration",
    googleCalendarIntegrationSchema
  );