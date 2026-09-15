import mongoose from "mongoose";

import { SmsConversationLock } from "@/models/SmsConversationLock";
import { Appointment } from "@/models/Appointment";
import { Message } from "@/models/Message";

import { updateLeadWithSmsFence } from "@/lib/sms/sms-fenced-lead";

type BookSmsAppointmentParams = {
  lead: any;
  businessId: any;
  normalizedPhone: string;
  ownerToken: string;
  fenceToken: number;
  selectedLabel: string;
  scheduledFor: Date;

  onLockLost?: () => void;
};

export async function bookSmsAppointmentAtomically({
  lead,
  businessId,
  normalizedPhone,
  ownerToken,
  fenceToken,
  selectedLabel,
  scheduledFor,
  onLockLost,
}: BookSmsAppointmentParams) {
  const session =
    await mongoose.startSession();

  let appointment: any = null;
  let aiMessage: any = null;
  let bookedLead: any = null;

  const confirmation =
    `Perfect! We've reserved ${selectedLabel}.`;

  try {
    await session.withTransaction(
      async () => {
        /* ===============================================
           VERIFY LOCK OWNERSHIP INSIDE TRANSACTION
           =============================================== */

        const ownedLock =
          await SmsConversationLock.findOne({
            businessId,

            phone:
              normalizedPhone,

            ownerToken,

            fenceToken,

            expiresAt: {
              $gt:
                new Date(),
            },
          })
            .session(session)
            .lean();

        if (!ownedLock) {
          onLockLost?.();

          throw new Error(
            "SMS conversation lock ownership was lost before appointment booking."
          );
        }

        /* ===============================================
           CREATE APPOINTMENT
           =============================================== */

        const createdAppointments =
          await Appointment.create(
            [
              {
                leadId:
                  lead._id,

                businessId:
                  lead.businessId,

                label:
                  selectedLabel,

                scheduledFor,

                status:
                  "scheduled",
              },
            ],
            {
              session,
            }
          );

        appointment =
          createdAppointments[0];

        if (!appointment) {
          throw new Error(
            "Appointment could not be created."
          );
        }

        /* ===============================================
           FENCED LEAD BOOKING
           =============================================== */

        bookedLead =
          await updateLeadWithSmsFence({
            leadId:
              lead._id,

            businessId,

            phone:
              normalizedPhone,

            fenceToken,

            session,

            set: {
              status:
                "booked",

              smsConversationActive:
                false,

              "followUp.enabled":
                false,

              "followUp.nextFollowUpAt":
                null,

              smsBookingOptions: {
                offeredAt:
                  null,

                slots:
                  [],
              },
            },
          });

        if (!bookedLead) {
          onLockLost?.();

          throw new Error(
            "Stale SMS worker rejected while booking appointment."
          );
        }

        /* ===============================================
           CONFIRMATION MESSAGE
           =============================================== */

        const createdMessages =
          await Message.create(
            [
              {
                leadId:
                  bookedLead._id,

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
          createdMessages[0];

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

  if (
    !appointment ||
    !aiMessage ||
    !bookedLead
  ) {
    throw new Error(
      "Appointment transaction completed without required records."
    );
  }

  return {
    appointment,
    lead:
      bookedLead,
    aiMessage,
    confirmation,
  };
}