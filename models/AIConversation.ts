import { Schema, model, models } from "mongoose";

const aiConversationSchema = new Schema(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    /*
     * Random server-generated token used by the public
     * browser to identify this conversation.
     *
     * Never use a predictable sequential identifier.
     */
    publicToken: {
      type: String,
      required: true,
    },

    /*
     * Once the anonymous visitor becomes a real Lead,
     * we can associate this conversation with that Lead.
     */
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
      index: true,
    },

    /*
     * Stripe billing period in which this conversation
     * consumed one AI-conversation quota unit.
     */
    countedPeriodStart: {
      type: Date,
      required: true,
    },

    countedPeriodEnd: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

/*
 * A public token must identify exactly one conversation
 * for one business.
 */
aiConversationSchema.index(
  {
    businessId: 1,
    publicToken: 1,
  },
  {
    unique: true,
    name: "unique_ai_conversation_token_per_business",
  },
);

/*
 * Helps us find conversations associated with a Lead.
 */
aiConversationSchema.index({
  businessId: 1,
  leadId: 1,
  createdAt: -1,
});

export const AIConversation =
  models.AIConversation || model("AIConversation", aiConversationSchema);
