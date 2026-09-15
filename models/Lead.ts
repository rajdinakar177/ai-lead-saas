import {
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



    smsFenceToken: {
      type: Number,
      default: 0,
      min: 0,
    },
    smsBookingOptions: {
      offeredAt: {
        type: Date,
        default: null,
      },

      slots: {
        type: [
          {
            _id: false,

            label: {
              type: String,
              required: true,
            },

            scheduledFor: {
              type: Date,
              required: true,
            },
          },
        ],

        default: [],
      },
    },

    /* =====================================================
       AUTOMATED FOLLOW-UP STATE
       ===================================================== */

    followUp: {
      enabled: {
        type: Boolean,
        default: true,
      },

      count: {
        type: Number,
        default: 0,
        min: 0,
      },

      nextFollowUpAt: {
        type: Date,
        default: null,
      },

      lastFollowUpAt: {
        type: Date,
        default: null,
      },
    },

    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

/* =========================================================
   FOLLOW-UP SCHEDULER INDEX
   ========================================================= */

leadSchema.index({
  "followUp.enabled": 1,
  "followUp.nextFollowUpAt": 1,
  status: 1,
});
leadSchema.index(
  {
    businessId: 1,
    phone: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      smsConversationActive: true,
      phone: {
        $type: "string",
      },
    },
    name: "unique_active_sms_conversation_per_business_phone",
  }
);
export const Lead =
  models.Lead ||
  model("Lead", leadSchema);