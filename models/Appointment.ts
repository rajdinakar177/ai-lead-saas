import {
  Schema,
  model,
  models,
} from "mongoose";

const appointmentSchema = new Schema(
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
  },
  {
    timestamps: true,
  }
);

export const Appointment =
  models.Appointment ||
  model(
    "Appointment",
    appointmentSchema
  );