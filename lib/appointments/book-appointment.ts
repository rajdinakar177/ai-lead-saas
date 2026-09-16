import mongoose from "mongoose";

import { Appointment } from "@/models/Appointment";
import { Lead } from "@/models/Lead";
import { Message } from "@/models/Message";

type BookAppointmentParams = {
  lead: any;
  label: string;
  scheduledFor: Date;
};

export async function bookAppointmentAtomically({
  lead,
  label,
  scheduledFor,
}: BookAppointmentParams) {
  const session =
    await mongoose.startSession();

  let appointment: any = null;
  let bookedLead: any = null;
  let leadMessage: any = null;
  let aiMessage: any = null;

  const confirmation =
    `Perfect! We've reserved ${label}.`;

  try {
    await session.withTransaction(
      async () => {
        // =====================================
        // CREATE APPOINTMENT
        // =====================================

        const appointments =
          await Appointment.create(
            [
              {
                leadId:
                  lead._id,

                businessId:
                  lead.businessId,

                scheduledFor,

                label,

                status:
                  "scheduled",
              },
            ],
            {
              session,
            }
          );

        appointment =
          appointments[0];

        if (!appointment) {
          throw new Error(
            "Appointment could not be created."
          );
        }

        // =====================================
        // UPDATE LEAD
        // =====================================

        bookedLead =
          await Lead.findOneAndUpdate(
            {
              _id:
                lead._id,

              businessId:
                lead.businessId,
            },
            {
              $set: {
                status:
                  "booked",

                smsConversationActive:
                  false,

                "followUp.enabled":
                  false,

                "followUp.nextFollowUpAt":
                  null,
              },
            },
            {
              new: true,
              session,
            }
          );

        if (!bookedLead) {
          throw new Error(
            "Lead could not be updated while booking appointment."
          );
        }

        // =====================================
        // SAVE LEAD BOOKING MESSAGE
        // =====================================

        const leadMessages =
          await Message.create(
            [
              {
                leadId:
                  lead._id,

                sender:
                  "lead",

                content:
                  label,
              },
            ],
            {
              session,
            }
          );

        leadMessage =
          leadMessages[0];

        if (!leadMessage) {
          throw new Error(
            "Booking message could not be created."
          );
        }

        // =====================================
        // SAVE AI CONFIRMATION MESSAGE
        // =====================================

        const aiMessages =
          await Message.create(
            [
              {
                leadId:
                  lead._id,

                sender:
                  "ai",

                content:
                  confirmation,
              },
            ],
            {
              session,
            }
          );

        aiMessage =
          aiMessages[0];

        if (!aiMessage) {
          throw new Error(
            "Appointment confirmation message could not be created."
          );
        }
      }
    );
  } finally {
    await session.endSession();
  }

  // Extra safety check.
  if (
    !appointment ||
    !bookedLead ||
    !leadMessage ||
    !aiMessage
  ) {
    throw new Error(
      "Appointment transaction completed without all required records."
    );
  }

  return {
    appointment,
    lead:
      bookedLead,
    leadMessage,
    aiMessage,
    confirmation,
  };
}