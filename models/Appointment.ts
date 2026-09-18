import {
  Schema,
  model,
  models,
} from "mongoose";

const appointmentSchema =
  new Schema(
    {
      leadId: {
        type: Schema.Types.ObjectId,
        ref: "Lead",
        required: true,
        index: true,
      },

      businessId: {
        type: Schema.Types.ObjectId,
        ref: "Business",
        required: true,
        index: true,
      },

      scheduledFor: {
        type: Date,
        required: true,
      },

      label: {
        type: String,
        required: true,
      },

      status: {
        type: String,
        enum: [
          "scheduled",
          "confirmed",
          "completed",
          "cancelled",
        ],
        default: "scheduled",
      },

      notes: {
        type: String,
      },

      /*
       * GOOGLE CALENDAR
       *
       * These fields allow Leadquivo to keep
       * this appointment linked to the exact
       * Google Calendar event.
       */

      googleCalendarEventId: {
        type: String,
        default: null,
        index: true,
      },

      googleCalendarId: {
        type: String,
        default: null,
      },

      googleCalendarSyncedAt: {
        type: Date,
        default: null,
      },

      googleCalendarSyncError: {
        type: String,
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

appointmentSchema.index(
  {
    businessId: 1,
    scheduledFor: 1,
  },
  {
    unique: true,

    partialFilterExpression: {
      status: {
        $in: [
          "scheduled",
          "confirmed",
        ],
      },
    },
  }
);

export const Appointment =
  models.Appointment ||
  model(
    "Appointment",
    appointmentSchema
  );