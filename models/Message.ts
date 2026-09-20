import { Schema, model, models } from "mongoose";

const messageSchema = new Schema(
  {
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      index: true,
    },

    sender: {
      type: String,
      enum: ["lead", "ai", "business"],
      required: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Message = models.Message || model("Message", messageSchema);
