import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { validatePhoneNumber } from "@/lib/phone";
import { verifyTwilioSignature } from "@/lib/sms/verify-twilio-signature";
import {
  updateLeadWithSmsFence,
  findOneAndUpdateLeadWithSmsFence,
} from "@/lib/sms/sms-fenced-lead";
import { randomUUID } from "crypto";
import {
  generateQualificationResponse,
  type AISettings,
} from "@/lib/ai/qualification";
import { SmsConversationLock } from "@/models/SmsConversationLock";
import {
  generateSlotsForDate,
  getDatesForTimeline,
  getDayName,
  type AvailabilityDay,
  type GeneratedSlot,
  type Timeline,
} from "@/lib/availability";

import { sendAppointmentBookedEmail } from "@/lib/email/send-appointment-booked-email";
import { sendSmsReply } from "@/lib/sms/send-sms-reply";
import {
  acquireSmsConversationLock,
  renewSmsConversationLock,
  releaseSmsConversationLock,
  checkSmsConversationLock,
} from "@/lib/sms/sms-conversation-lock";
import {
  canFollowUp,
  getNextFollowUpAt,
} from "@/lib/follow-up";

import { Lead } from "@/models/Lead";
import { Business } from "@/models/Business";
import { Message } from "@/models/Message";
import { Appointment } from "@/models/Appointment";
import { TwilioInboundEvent } from "@/models/TwilioInboundEvent";

/* =========================================================
   LEAD STATUS GROUPS
   ========================================================= */

const ACTIVE_LEAD_STATUSES = [
  "new",
  "warm",
  "hot",
  "qualified",
] as const;

const VALID_TIMELINES: Timeline[] = [
  "Today",
  "Tomorrow",
  "This week",
  "Next week",
];

/*
 * Conversation locks use a 120 second lease.
 * Renew every 40 seconds so a healthy worker refreshes the
 * lease well before it expires.
 */
const SMS_CONVERSATION_LOCK_LEASE_MS =
  120000;

const SMS_CONVERSATION_LOCK_RENEW_MS =
  40000;

/* =========================================================
   POST
   ========================================================= */

export async function POST(request: Request) {
  let claimedMessageSid: string | null = null;
  let claimedProcessingToken: string | null = null;
  let conversationLockOwner: string | null = null;
  let conversationLockFenceToken: number | null = null;
  let conversationLockBusinessId: any = null;
  let conversationLockPhone: string | null = null;

  let conversationLockLost =
    false;

  let conversationLockRenewalStopped =
    false;

  let conversationLockRenewalTimer:
    ReturnType<typeof setTimeout> | null =
    null;

  let conversationLockRenewalInFlight:
    Promise<void> | null =
    null;

  let processingError: unknown = null;

  /*
   * Use this instead of returning twimlResponse() directly.
   *
   * If the heartbeat discovers that this worker lost the
   * conversation lock, return 503 so Twilio can retry rather
   * than acknowledging work that may no longer be safe.
   */
  const successResponse = () =>
    conversationLockLost
      ? retryResponse()
      : twimlResponse();

  /*
   * Schedule one renewal at a time. We intentionally use
   * recursive setTimeout instead of setInterval so renewal
   * calls can never overlap.
   */
  const scheduleConversationLockRenewal =
    () => {
      if (
        conversationLockRenewalStopped ||
        conversationLockLost ||
        !conversationLockOwner ||
        conversationLockFenceToken ===
        null ||
        !conversationLockBusinessId ||
        !conversationLockPhone
      ) {
        return;
      }

      conversationLockRenewalTimer =
        setTimeout(() => {
          conversationLockRenewalInFlight =
            (async () => {
              try {
                const renewed =
                  await renewSmsConversationLock({
                    businessId:
                      conversationLockBusinessId,

                    phone:
                      conversationLockPhone!,

                    ownerToken:
                      conversationLockOwner!,

                    fenceToken:
                      conversationLockFenceToken!,

                    leaseMs:
                      SMS_CONVERSATION_LOCK_LEASE_MS,
                  });

                if (!renewed) {
                  conversationLockLost =
                    true;

                  processingError =
                    processingError ??
                    new Error(
                      "SMS conversation lock ownership was lost."
                    );

                  console.error(
                    "SMS conversation lock renewal rejected:",
                    {
                      businessId:
                        conversationLockBusinessId?.toString?.() ??
                        conversationLockBusinessId,

                      phone:
                        conversationLockPhone,

                      fenceToken:
                        conversationLockFenceToken,
                    }
                  );

                  return;
                }

                console.log(
                  "SMS conversation lock renewed:",
                  {
                    businessId:
                      conversationLockBusinessId?.toString?.() ??
                      conversationLockBusinessId,

                    phone:
                      conversationLockPhone,

                    fenceToken:
                      conversationLockFenceToken,

                    expiresAt:
                      renewed.expiresAt,
                  }
                );
              } catch (error) {
                /*
                 * Be conservative: if MongoDB cannot confirm
                 * renewal, this worker must no longer assume
                 * it owns the conversation.
                 */
                conversationLockLost =
                  true;

                processingError =
                  processingError ??
                  error;

                console.error(
                  "SMS conversation lock renewal failed:",
                  error
                );
              } finally {
                conversationLockRenewalInFlight =
                  null;

                if (
                  !conversationLockRenewalStopped &&
                  !conversationLockLost
                ) {
                  scheduleConversationLockRenewal();
                }
              }
            })();
        }, SMS_CONVERSATION_LOCK_RENEW_MS);
    };

  try {
    /* =====================================================
       READ TWILIO FORM DATA
       ===================================================== */

    const formData =
      await request.formData();

    const messageSid =
      formData
        .get("MessageSid")
        ?.toString()
        .trim();

    const from =
      formData
        .get("From")
        ?.toString()
        .trim();

    const to =
      formData
        .get("To")
        ?.toString()
        .trim();

    const body =
      formData
        .get("Body")
        ?.toString()
        .trim();

    console.log(
      "Incoming Twilio SMS:",
      {
        messageSid,
        from,
        to,
        body,
      }
    );

    /* =====================================================
       TWILIO SIGNATURE VALIDATION
       ===================================================== */

    const signatureValidationEnabled =
      process.env
        .TWILIO_SIGNATURE_VALIDATION ===
      "true";

    if (signatureValidationEnabled) {
      const signature =
        request.headers.get(
          "x-twilio-signature"
        );

      const twilioParams: Record<
        string,
        string
      > = {};

      for (
        const [key, value] of
        formData.entries()
      ) {
        if (
          typeof value ===
          "string"
        ) {
          twilioParams[key] =
            value;
        }
      }

      const webhookUrl =
        process.env
          .TWILIO_WEBHOOK_URL
          ?.trim() ||
        request.url;

      let signatureValid =
        false;

      try {
        signatureValid =
          verifyTwilioSignature({
            signature,
            url: webhookUrl,
            params:
              twilioParams,
          });
      } catch (error) {
        console.error(
          "Twilio signature validation error:",
          error
        );

        return forbiddenResponse();
      }

      if (!signatureValid) {
        console.warn(
          "Invalid Twilio signature rejected:",
          {
            messageSid,
            from,
            to,
          }
        );

        return forbiddenResponse();
      }

      console.log(
        "Twilio signature verified:",
        messageSid
      );
    } else {
      console.log(
        "Twilio signature validation disabled for local testing."
      );
    }

    /* =====================================================
       REQUIRED TWILIO FIELDS
       ===================================================== */

    if (
      !messageSid ||
      !from ||
      !to ||
      !body
    ) {
      return successResponse();
    }

    await connectDB();

    /* =====================================================
       MESSAGE SID IDEMPOTENCY / RETRY CLAIM
       ===================================================== */

    const eventClaim =
      await claimTwilioInboundEvent({
        messageSid,
        from,
        to,
        body,
      });

    if (!eventClaim.shouldProcess) {
      console.log(
        "Twilio webhook already handled or currently processing:",
        messageSid
      );

      return successResponse();
    }

    claimedMessageSid =
      messageSid;

    claimedProcessingToken =
      eventClaim.processingToken;

    /* =====================================================
       FIND BUSINESS FROM TWILIO TO NUMBER
       ===================================================== */

    const business =
      await Business.findOne({
        twilioPhoneNumber:
          to,
      }).lean();

    if (!business) {
      console.warn(
        "No business found for Twilio number:",
        to
      );

      return successResponse();
    }

    /* =====================================================
       NORMALIZE CUSTOMER PHONE
       ===================================================== */

    const phoneResult =
      validatePhoneNumber(
        from,
        "US"
      );

    if (
      !phoneResult.valid ||
      !phoneResult.normalized
    ) {
      console.warn(
        "Invalid incoming phone:",
        from
      );

      return successResponse();
    }

    const normalizedPhone =
      phoneResult.normalized;

    /* =====================================================
       PER-CONVERSATION DISTRIBUTED LOCK

       Everything below this point that reads or changes a
       lead conversation is serialized by business + phone.
       ===================================================== */

    const conversationLock =
      await acquireSmsConversationLock({
        businessId:
          business._id,

        phone:
          normalizedPhone,

        waitMs:
          15000,

        leaseMs:
          SMS_CONVERSATION_LOCK_LEASE_MS,
      });

    if (!conversationLock) {
      processingError =
        new Error(
          "SMS conversation is busy. Please retry."
        );

      console.warn(
        "Could not acquire SMS conversation lock:",
        {
          businessId:
            business._id.toString(),

          phone:
            normalizedPhone,

          messageSid,
        }
      );

      return retryResponse();
    }

    conversationLockOwner =
      conversationLock.ownerToken;

    conversationLockFenceToken =
      conversationLock.fenceToken;

    conversationLockBusinessId =
      business._id;

    conversationLockPhone =
      normalizedPhone;

    /*
     * Keep the lease alive while this webhook is processing.
     */
    scheduleConversationLockRenewal();

    /*
     * A stale Twilio event may have been reclaimed while the
     * original worker still held the conversation lock.
     *
     * Once we own the lock, check whether that original
     * worker already completed the event.
     */
    const eventAfterLock =
      await TwilioInboundEvent.findOne({
        messageSid,
      })
        .select(
          "status processingToken"
        )
        .lean();

    if (
      eventAfterLock?.status ===
      "processed"
    ) {
      console.log(
        "Twilio webhook completed by another worker while waiting for lock:",
        messageSid
      );

      claimedMessageSid =
        null;

      claimedProcessingToken =
        null;

      return successResponse();
    }

    /*
     * We may have claimed the Twilio event and then waited for
     * the conversation lock long enough for another worker to
     * reclaim this event.
     *
     * If the processing token no longer matches, this worker
     * must not continue.
     */
    if (
      !eventAfterLock ||
      eventAfterLock.status !==
      "processing" ||
      eventAfterLock.processingToken !==
      claimedProcessingToken
    ) {
      console.warn(
        "Twilio event ownership lost while waiting for SMS conversation lock:",
        {
          messageSid,

          claimedProcessingToken,

          currentProcessingToken:
            eventAfterLock?.processingToken,

          currentStatus:
            eventAfterLock?.status,
        }
      );

      claimedMessageSid =
        null;

      claimedProcessingToken =
        null;

      return successResponse();
    }

    /* =====================================================
       FIND LATEST LEAD
       ===================================================== */

    const latestLead =
      await Lead.findOne({
        businessId:
          business._id,

        phone:
          normalizedPhone,
      }).sort({
        createdAt:
          -1,
      });

    if (!latestLead) {
      console.warn(
        "No lead found for incoming SMS:",
        {
          businessId:
            business._id.toString(),

          phone:
            normalizedPhone,
        }
      );

      return successResponse();
    }

    /* =====================================================
       BUSINESS AI SETTINGS
       ===================================================== */

    const aiSettings: AISettings = {
      businessDescription:
        business.aiSettings
          ?.businessDescription ??
        "",

      services:
        business.aiSettings
          ?.services ??
        [],

      serviceAreas:
        business.aiSettings
          ?.serviceAreas ??
        [],

      welcomeMessage:
        business.aiSettings
          ?.welcomeMessage ??
        "",

      tone:
        business.aiSettings
          ?.tone ??
        "friendly",

      qualificationFields:
        business.aiSettings
          ?.qualificationFields ??
        [
          "name",
          "phone",
          "service",
          "location",
          "urgency",
          "timeline",
        ],

      additionalInstructions:
        business.aiSettings
          ?.additionalInstructions ??
        "",
    };

    /* =====================================================
       FIND CURRENT ACTIVE SMS CONVERSATION
       ===================================================== */

    let lead =
      await Lead.findOne({
        businessId:
          business._id,

        phone:
          normalizedPhone,

        smsConversationActive:
          true,
      }).sort({
        updatedAt:
          -1,
      });

    /* =====================================================
       EXPLICIT SERVICE SWITCH

       If there is already an active SMS conversation but the
       customer explicitly names another open service request,
       switch to that lead before saving or processing this
       message.

       This is safe because the per-business + phone MongoDB
       conversation lock is already held at this point.
       ===================================================== */

    if (lead) {
      const openLeadsForSwitch =
        await Lead.find({
          businessId:
            business._id,

          phone:
            normalizedPhone,

          status: {
            $in:
              ACTIVE_LEAD_STATUSES,
          },
        }).sort({
          createdAt:
            -1,
        });

      /*
       * First check whether the customer explicitly named
       * one of the business's configured services.
       *
       * This is important because the requested service may
       * not have an existing Lead yet.
       */
      const requestedService =
        findConfiguredService(
          aiSettings.services,
          body
        );

      if (requestedService) {
        /*
         * Check whether an existing open Lead already represents
         * this configured service.
         */
        const requestedServiceNormalized =
          normalizeText(
            requestedService
          );

        const existingRequestedLead =
          openLeadsForSwitch.find(
            (item) =>
              item.service &&
              normalizeText(
                item.service
              ) ===
              requestedServiceNormalized
          );

        /* ===================================================
           CASE 1:
           REQUESTED SERVICE ALREADY HAS AN OPEN LEAD
           =================================================== */

        if (
          existingRequestedLead &&
          existingRequestedLead._id.toString() !==
          lead._id.toString()
        ) {
          const previousActiveLead =
            lead;

          console.log(
            "Explicit service switch requested:",
            {
              fromLeadId:
                previousActiveLead._id.toString(),

              fromService:
                previousActiveLead.service,

              toLeadId:
                existingRequestedLead._id.toString(),

              toService:
                existingRequestedLead.service,
            }
          );

          const deactivated =
            await findOneAndUpdateLeadWithSmsFence({
              filter: {
                _id:
                  previousActiveLead._id,

                businessId:
                  business._id,

                phone:
                  normalizedPhone,

                smsConversationActive:
                  true,
              },

              fenceToken:
                conversationLockFenceToken!,

              set: {
                smsConversationActive:
                  false,
              },
            });

          if (!deactivated) {
            console.warn(
              "Could not deactivate current SMS conversation during service switch:",
              {
                leadId:
                  previousActiveLead._id.toString(),

                phone:
                  normalizedPhone,
              }
            );

            return successResponse();
          }

          try {
            const switchedLead =
              await findOneAndUpdateLeadWithSmsFence({
                filter: {
                  _id:
                    existingRequestedLead._id,

                  businessId:
                    business._id,

                  phone:
                    normalizedPhone,

                  status: {
                    $in:
                      ACTIVE_LEAD_STATUSES,
                  },

                  smsConversationActive: {
                    $ne:
                      true,
                  },
                },

                fenceToken:
                  conversationLockFenceToken!,

                set: {
                  smsConversationActive:
                    true,
                },
              });

            if (!switchedLead) {
              await restorePreviousSmsConversation({
                leadId:
                  previousActiveLead._id,

                businessId:
                  business._id,

                phone:
                  normalizedPhone,

                fenceToken:
                  conversationLockFenceToken!,
              });

              console.warn(
                "Requested SMS service could not be activated because the lead changed state:",
                {
                  requestedLeadId:
                    existingRequestedLead._id.toString(),

                  requestedService:
                    existingRequestedLead.service,
                }
              );

              return successResponse();
            }

            lead =
              switchedLead;

            console.log(
              "SMS conversation switched by explicit service:",
              {
                leadId:
                  lead._id.toString(),

                service:
                  lead.service,

                previousLeadId:
                  previousActiveLead._id.toString(),

                previousService:
                  previousActiveLead.service,
              }
            );
          } catch (error) {
            await restorePreviousSmsConversation({
              leadId:
                previousActiveLead._id,

              businessId:
                business._id,

              phone:
                normalizedPhone,

              fenceToken:
                conversationLockFenceToken!,
            });

            throw error;
          }
        }

        /* ===================================================
           CASE 2:
           REQUESTED SERVICE DOES NOT HAVE AN OPEN LEAD YET
           =================================================== */

        else if (
          !existingRequestedLead &&
          normalizeText(
            lead.service ?? ""
          ) !==
          requestedServiceNormalized
        ) {
          const previousActiveLead =
            lead;

          console.log(
            "Explicit new service request detected:",
            {
              previousLeadId:
                previousActiveLead._id.toString(),

              previousService:
                previousActiveLead.service,

              requestedService,
            }
          );

          /*
           * Deactivate the current conversation first.
           * The unique partial index then allows the new Lead
           * to become the active SMS conversation.
           */
          const deactivated =
            await findOneAndUpdateLeadWithSmsFence({
              filter: {
                _id:
                  previousActiveLead._id,

                businessId:
                  business._id,

                phone:
                  normalizedPhone,

                smsConversationActive:
                  true,
              },

              fenceToken:
                conversationLockFenceToken!,

              set: {
                smsConversationActive:
                  false,
              },
            });

          if (!deactivated) {
            console.warn(
              "Could not deactivate current SMS conversation before creating new service lead:",
              {
                leadId:
                  previousActiveLead._id.toString(),

                requestedService,
              }
            );

            return successResponse();
          }

          try {
            const createdLead =
              await Lead.create({
                businessId:
                  business._id,

                phone:
                  normalizedPhone,

                name:
                  previousActiveLead.name ??
                  latestLead.name ??
                  null,

                industry:
                  business.industry,

                service:
                  requestedService,

                location:
                  null,

                urgency:
                  null,

                timeline:
                  null,

                status:
                  "new",

                source:
                  "sms",

                smsConversationActive:
                  true,

                smsFenceToken:
                  conversationLockFenceToken!,
              });

            lead =
              createdLead;

            console.log(
              "New SMS service conversation created from explicit service switch:",
              {
                previousLeadId:
                  previousActiveLead._id.toString(),

                previousService:
                  previousActiveLead.service,

                newLeadId:
                  lead._id.toString(),

                newService:
                  lead.service,

                fenceToken:
                  conversationLockFenceToken,
              }
            );
          } catch (error) {
            /*
             * If creation fails, try to restore the previous
             * conversation so the customer is not left without
             * an active SMS Lead.
             */
            await restorePreviousSmsConversation({
              leadId:
                previousActiveLead._id,

              businessId:
                business._id,

              phone:
                normalizedPhone,

              fenceToken:
                conversationLockFenceToken!,
            });

            throw error;
          }
        }
      } else {
        /*
         * Keep the original existing-lead matcher as a fallback.
         * This supports historical/open leads whose service may
         * no longer be present in the current business settings.
         */
        const explicitlyMatchedLead =
          findLeadByService(
            openLeadsForSwitch,
            body
          );

        if (
          explicitlyMatchedLead &&
          explicitlyMatchedLead._id.toString() !==
          lead._id.toString()
        ) {
          const previousActiveLead =
            lead;

          console.log(
            "Explicit service switch requested:",
            {
              fromLeadId:
                previousActiveLead._id.toString(),

              fromService:
                previousActiveLead.service,

              toLeadId:
                explicitlyMatchedLead._id.toString(),

              toService:
                explicitlyMatchedLead.service,
            }
          );

          const deactivated =
            await findOneAndUpdateLeadWithSmsFence({
              filter: {
                _id:
                  previousActiveLead._id,

                businessId:
                  business._id,

                phone:
                  normalizedPhone,

                smsConversationActive:
                  true,
              },

              fenceToken:
                conversationLockFenceToken!,

              set: {
                smsConversationActive:
                  false,
              },
            });

          if (!deactivated) {
            return successResponse();
          }

          try {
            const switchedLead =
              await findOneAndUpdateLeadWithSmsFence({
                filter: {
                  _id:
                    explicitlyMatchedLead._id,

                  businessId:
                    business._id,

                  phone:
                    normalizedPhone,

                  status: {
                    $in:
                      ACTIVE_LEAD_STATUSES,
                  },

                  smsConversationActive: {
                    $ne:
                      true,
                  },
                },

                fenceToken:
                  conversationLockFenceToken!,

                set: {
                  smsConversationActive:
                    true,
                },
              });

            if (!switchedLead) {
              await restorePreviousSmsConversation({
                leadId:
                  previousActiveLead._id,

                businessId:
                  business._id,

                phone:
                  normalizedPhone,

                fenceToken:
                  conversationLockFenceToken!,
              });

              return successResponse();
            }

            lead =
              switchedLead;

            console.log(
              "SMS conversation switched by explicit service:",
              {
                leadId:
                  lead._id.toString(),

                service:
                  lead.service,

                previousLeadId:
                  previousActiveLead._id.toString(),

                previousService:
                  previousActiveLead.service,
              }
            );
          } catch (error) {
            await restorePreviousSmsConversation({
              leadId:
                previousActiveLead._id,

              businessId:
                business._id,

              phone:
                normalizedPhone,

              fenceToken:
                conversationLockFenceToken!,
            });

            throw error;
          }
        }
      }
    }

    /* =====================================================
       NO ACTIVE SMS CONVERSATION
       ===================================================== */

    if (!lead) {
      const openLeads =
        await Lead.find({
          businessId:
            business._id,

          phone:
            normalizedPhone,

          status: {
            $in:
              ACTIVE_LEAD_STATUSES,
          },
        }).sort({
          createdAt:
            -1,
        });

      /* ===================================================
         CASE 1:
         ONLY ONE OPEN LEAD
         =================================================== */

      if (
        openLeads.length ===
        1
      ) {
        const requestedLead =
          openLeads[0];

        const activation =
          await activateSmsConversation({
            targetLeadId:
              requestedLead._id,

            businessId:
              business._id,

            phone:
              normalizedPhone,
            fenceToken:
              conversationLockFenceToken!,
          });

        if (!activation) {
          console.warn(
            "Unable to activate SMS conversation:",
            {
              requestedLeadId:
                requestedLead._id.toString(),

              phone:
                normalizedPhone,
            }
          );

          return successResponse();
        }

        lead =
          activation.lead;

        if (
          activation
            .requestedLeadActivated
        ) {
          console.log(
            "Automatically activated SMS conversation:",
            {
              leadId:
                lead._id.toString(),

              service:
                lead.service,

              status:
                lead.status,
            }
          );
        } else {
          console.log(
            "SMS activation race resolved to existing active conversation:",
            {
              requestedLeadId:
                requestedLead._id.toString(),

              activeLeadId:
                lead._id.toString(),

              service:
                lead.service,
            }
          );
        }
      }

      /* ===================================================
         CASE 2:
         MULTIPLE OPEN LEADS
         =================================================== */

      else if (
        openLeads.length >
        1
      ) {
        const matchedLead =
          findLeadByService(
            openLeads,
            body
          );

        if (matchedLead) {
          /*
           * IMPORTANT:
           *
           * Do NOT deactivate every lead first.
           *
           * The unique partial MongoDB index guarantees that
           * only one lead for business + phone can become
           * active.
           *
           * activateSmsConversation() handles a concurrent
           * worker safely.
           */

          const activation =
            await activateSmsConversation({
              targetLeadId:
                matchedLead._id,

              businessId:
                business._id,

              phone:
                normalizedPhone,
              fenceToken:
                conversationLockFenceToken!,
            });

          if (!activation) {
            console.warn(
              "Unable to activate selected SMS conversation:",
              {
                requestedLeadId:
                  matchedLead._id.toString(),

                phone:
                  normalizedPhone,
              }
            );

            return successResponse();
          }

          lead =
            activation.lead;

          if (
            activation
              .requestedLeadActivated
          ) {
            console.log(
              "SMS conversation selected by service:",
              {
                leadId:
                  lead._id.toString(),

                service:
                  lead.service,
              }
            );
          } else {
            /*
             * Another webhook activated a conversation
             * between our initial lookup and this update.
             *
             * Use the database winner instead of disabling
             * it or causing a 500.
             */
            console.log(
              "SMS service-selection race resolved to existing active conversation:",
              {
                requestedLeadId:
                  matchedLead._id.toString(),

                requestedService:
                  matchedLead.service,

                activeLeadId:
                  lead._id.toString(),

                activeService:
                  lead.service,
              }
            );
          }
        } else {
          const uniqueServices =
            Array.from(
              new Set(
                openLeads
                  .map(
                    (item) =>
                      item.service
                        ?.trim()
                  )
                  .filter(
                    (
                      service
                    ): service is string =>
                      Boolean(
                        service
                      )
                  )
              )
            );

          let clarification =
            "You currently have more than one active service request.";

          if (
            uniqueServices.length >
            0
          ) {
            clarification +=
              ` Please reply with the service you want to continue: ${uniqueServices.join(
                " or "
              )}.`;
          } else {
            clarification +=
              " Please tell me which service request you want to continue.";
          }
          await assertSmsConversationOwnership({
            businessId:
              business._id,

            phone:
              normalizedPhone,

            ownerToken:
              conversationLockOwner!,

            fenceToken:
              conversationLockFenceToken!,
          });
          try {

            await sendSmsReply({
              to:
                normalizedPhone,

              body:
                clarification,
            });
          } catch (smsError) {
            console.error(
              "SMS lead-selection reply failed:",
              smsError
            );
          }

          console.log(
            "Multiple active leads require service selection:",
            {
              phone:
                normalizedPhone,

              leads:
                openLeads.map(
                  (item) => ({
                    id:
                      item._id.toString(),

                    service:
                      item.service,

                    status:
                      item.status,
                  })
                ),
            }
          );

          return successResponse();
        }
      }

      /* ===================================================
         CASE 3:
         NO OPEN LEADS
         =================================================== */

      else {
        console.log(
          "No active/open lead. Checking for new service request..."
        );

        const newRequestResult =
          await generateQualificationResponse(
            {
              messages: [
                {
                  sender:
                    "user",

                  text:
                    body,
                },
              ],

              lead: {
                phone:
                  normalizedPhone,

                industry:
                  business.industry,
              },
            },

            {
              name:
                business.name,

              industry:
                business.industry,

              country:
                business.country ??
                "US",

              aiSettings,
            }
          );

        if (
          newRequestResult.lead
            .service
        ) {
          let createdLead:
            any = null;

          try {
            /*
             * Create the new lead directly as the active
             * conversation.
             *
             * The unique partial index protects this from
             * concurrent creation.
             */

            createdLead =
              await Lead.create({
                businessId:
                  business._id,

                phone:
                  normalizedPhone,

                name:
                  newRequestResult.lead
                    .name ??
                  latestLead.name ??
                  null,

                industry:
                  newRequestResult.lead
                    .industry ??
                  business.industry,

                service:
                  newRequestResult.lead
                    .service,

                location:
                  newRequestResult.lead
                    .location ??
                  null,

                urgency:
                  newRequestResult.lead
                    .urgency ??
                  null,

                timeline:
                  newRequestResult.lead
                    .timeline ??
                  null,

                status:
                  newRequestResult
                    .readyToBook
                    ? "qualified"
                    : newRequestResult
                      .status,

                source:
                  "sms",

                smsConversationActive:
                  true,
                smsFenceToken:
                  conversationLockFenceToken!,
              });
          } catch (error) {
            if (
              !isMongoDuplicateKeyError(
                error
              )
            ) {
              throw error;
            }

            /*
             * Another request created / activated a lead for
             * this business + phone before this request.
             *
             * Reload that winner and continue processing the
             * current inbound SMS against it.
             */

            const activeWinner =
              await Lead.findOne({
                businessId:
                  business._id,

                phone:
                  normalizedPhone,

                smsConversationActive:
                  true,
              }).sort({
                updatedAt:
                  -1,
              });

            if (!activeWinner) {
              console.error(
                "Duplicate active SMS conversation detected but winning lead could not be loaded:",
                {
                  businessId:
                    business._id.toString(),

                  phone:
                    normalizedPhone,
                }
              );

              return successResponse();
            }

            lead =
              activeWinner;

            console.log(
              "New SMS lead creation race resolved to existing active conversation:",
              {
                activeLeadId:
                  lead._id.toString(),

                service:
                  lead.service,

                phone:
                  normalizedPhone,
              }
            );
          }

          /* ===============================================
             NEW LEAD WAS SUCCESSFULLY CREATED
             =============================================== */

          if (createdLead) {
            lead =
              createdLead;

            /* =============================================
               SCHEDULE FOLLOW-UP FOR NEW SMS LEAD
               ============================================= */

            if (
              canFollowUp(
                lead.status,
                lead.phone
              )
            ) {
              lead.followUp =
                lead.followUp ?? {};

              lead.followUp.enabled =
                true;

              lead.followUp.count =
                lead.followUp.count ??
                0;

              lead.followUp.lastFollowUpAt =
                lead.followUp
                  .lastFollowUpAt ??
                null;

              lead.followUp.nextFollowUpAt =
                getNextFollowUpAt(
                  lead.followUp.count
                );
            } else {
              lead.followUp =
                lead.followUp ?? {};

              lead.followUp.enabled =
                false;

              lead.followUp.nextFollowUpAt =
                null;
            }

            const fencedNewLead =
              await updateLeadWithSmsFence({
                leadId:
                  lead._id,

                businessId:
                  business._id,

                phone:
                  normalizedPhone,

                fenceToken:
                  conversationLockFenceToken!,

                set: {
                  status:
                    lead.status,

                  smsConversationActive:
                    lead.smsConversationActive,

                  "followUp.enabled":
                    lead.followUp
                      ?.enabled ??
                    false,

                  "followUp.count":
                    lead.followUp
                      ?.count ??
                    0,

                  "followUp.nextFollowUpAt":
                    lead.followUp
                      ?.nextFollowUpAt ??
                    null,

                  "followUp.lastFollowUpAt":
                    lead.followUp
                      ?.lastFollowUpAt ??
                    null,
                },
              });

            if (!fencedNewLead) {
              conversationLockLost =
                true;

              throw new Error(
                "Stale SMS worker rejected while saving new service lead."
              );
            }

            lead =
              fencedNewLead;

            await Message.create({
              leadId:
                lead._id,

              sender:
                "lead",

              content:
                body,
            });

            const aiMessage =
              await Message.create({
                leadId:
                  lead._id,

                sender:
                  "ai",

                content:
                  newRequestResult.reply,
              });
            await assertSmsConversationOwnership({
              businessId:
                business._id,

              phone:
                normalizedPhone,

              ownerToken:
                conversationLockOwner!,

              fenceToken:
                conversationLockFenceToken!,
            });
            try {

              await sendSmsReply({
                to:
                  normalizedPhone,

                body:
                  newRequestResult.reply,
              });
            } catch (smsError) {
              console.error(
                "New service request SMS reply failed:",
                smsError
              );
            }

            console.log(
              "New SMS service request created:",
              {
                previousLeadId:
                  latestLead._id.toString(),

                newLeadId:
                  lead._id.toString(),

                service:
                  lead.service,

                status:
                  lead.status,

                smsConversationActive:
                  lead.smsConversationActive,

                followUpEnabled:
                  lead.followUp
                    ?.enabled,

                nextFollowUpAt:
                  lead.followUp
                    ?.nextFollowUpAt,

                messageId:
                  aiMessage._id.toString(),
              }
            );

            return successResponse();
          }

          /*
           * If we reach here, another concurrent webhook won
           * creation and "lead" now contains that active
           * conversation.
           *
           * Do NOT return.
           *
           * Continue below so this request's SMS is saved and
           * processed against the winning conversation.
           */
        } else {
          await Message.create({
            leadId:
              latestLead._id,

            sender:
              "lead",

            content:
              body,
          });

          console.log(
            "SMS attached to latest closed lead:",
            {
              leadId:
                latestLead._id.toString(),

              status:
                latestLead.status,

              body,
            }
          );

          return successResponse();
        }
      }
    }

    /* =====================================================
       ACTIVE LEAD IS NOW RESOLVED
       ===================================================== */

    if (!lead) {
      console.warn(
        "Unable to resolve SMS lead."
      );

      return successResponse();
    }

    /* =====================================================
       CUSTOMER REPLIED

       Cancel previous follow-up timer.
       A new one will be scheduled after AI response.
       ===================================================== */

    if (
      conversationLockFenceToken ===
      null
    ) {
      throw new Error(
        "Missing SMS conversation fence token."
      );
    }

    const fencedReplyLead =
      await updateLeadWithSmsFence({
        leadId:
          lead._id,

        businessId:
          business._id,

        phone:
          normalizedPhone,

        fenceToken:
          conversationLockFenceToken,

        set: {
          "followUp.nextFollowUpAt":
            null,
        },
      });

    if (!fencedReplyLead) {
      conversationLockLost =
        true;

      throw new Error(
        "Stale SMS worker rejected while processing customer reply."
      );
    }

    /*
     * Continue using the fresh database document returned by
     * the fenced update.
     */
    lead =
      fencedReplyLead;

    /* =====================================================
       SAVE CUSTOMER MESSAGE
       ===================================================== */

    const incomingMessage =
      await Message.create({
        leadId:
          lead._id,

        sender:
          "lead",

        content:
          body,
      });

    console.log(
      "Incoming SMS saved:",
      {
        business:
          business.name,

        leadId:
          lead._id.toString(),

        messageId:
          incomingMessage._id.toString(),

        phone:
          normalizedPhone,

        service:
          lead.service,

        status:
          lead.status,

        smsConversationActive:
          lead.smsConversationActive,
      }
    );

    /* =====================================================
       SMS APPOINTMENT SELECTION
       ===================================================== */

    const selectedOption =
      /^[1-3]$/.test(body)
        ? Number(body)
        : null;

    if (
      selectedOption &&
      lead.timeline &&
      lead.status ===
      "qualified"
    ) {
      const timeline =
        lead.timeline as Timeline;

      if (
        VALID_TIMELINES.includes(
          timeline
        )
      ) {
        /* ===============================================
           READ EXACT PREVIOUSLY OFFERED SLOT
           =============================================== */

        const storedSlots =
          lead.smsBookingOptions
            ?.slots ?? [];

        const storedSlot =
          storedSlots[
          selectedOption - 1
          ];

        /* ===============================================
           NO STORED OPTION
           =============================================== */

        if (!storedSlot) {
          await sendFreshSmsAppointmentOptions({
            lead,
            business,
            timeline,
            normalizedPhone,
            ownerToken:
              conversationLockOwner!,
            fenceToken:
              conversationLockFenceToken!,

            reason:
              "Those appointment options are no longer current. Here are the latest available times:",
          });

          return successResponse();
        }

        const scheduledFor =
          new Date(
            storedSlot.scheduledFor
          );

        const selectedLabel =
          storedSlot.label;

        /* ===============================================
           REVALIDATE EXACT STORED SLOT
           =============================================== */

        const currentAvailableSlots =
          await getSmsAvailableSlots({
            business,
            timeline,
          });

        const exactSlotStillAvailable =
          currentAvailableSlots.some(
            (slot) =>
              new Date(
                slot.scheduledFor
              ).getTime() ===
              scheduledFor.getTime()
          );

        /* ===============================================
           EXACT OFFERED SLOT NO LONGER AVAILABLE
           =============================================== */

        if (
          !exactSlotStillAvailable
        ) {
          console.log(
            "Previously offered SMS appointment is no longer available:",
            {
              leadId:
                lead._id.toString(),

              option:
                selectedOption,

              label:
                selectedLabel,

              scheduledFor:
                scheduledFor.toISOString(),
            }
          );

          await sendFreshSmsAppointmentOptions({
            lead,
            business,
            timeline,
            normalizedPhone,
            ownerToken:
              conversationLockOwner!,
            fenceToken:
              conversationLockFenceToken!,
            reason:
              `Sorry, ${selectedLabel} is no longer available. Here are the latest available times:`,
          });

          return successResponse();
        }

        /* ===============================================
           SECOND DATABASE CONFLICT CHECK
           =============================================== */

        const existingAppointment =
          await Appointment.findOne({
            businessId:
              lead.businessId,

            scheduledFor,

            status: {
              $in: [
                "scheduled",
                "confirmed",
              ],
            },
          }).lean();

        if (
          existingAppointment
        ) {
          console.log(
            "Stored SMS appointment slot already taken:",
            {
              leadId:
                lead._id.toString(),

              option:
                selectedOption,

              label:
                selectedLabel,

              scheduledFor:
                scheduledFor.toISOString(),
            }
          );

          await sendFreshSmsAppointmentOptions({
            lead,
            business,
            timeline,
            normalizedPhone,
            ownerToken:
              conversationLockOwner!,
            fenceToken:
              conversationLockFenceToken!,
            reason:
              `Sorry, ${selectedLabel} was just taken. Here are the latest available times:`,
          });

          return successResponse();
        }

        try {
          /* =============================================
             ATOMIC SMS APPOINTMENT BOOKING
        
             Transaction guarantees:
        
             1. Current worker still owns SMS lock.
             2. Appointment is created.
             3. Lead becomes booked.
             4. Confirmation DB message is created.
        
             Either all commit or all roll back.
             ============================================= */

          const session =
            await mongoose.startSession();

          let appointment:
            any = null;

          let aiMessage:
            any = null;

          const confirmation =
            `Perfect! We've reserved ${selectedLabel}.`;

          try {
            await session.withTransaction(
              async () => {
                /* =======================================
                   VERIFY CURRENT LOCK OWNERSHIP INSIDE TX
                   ======================================= */

                const ownedLock =
                  await SmsConversationLock.findOne({
                    businessId:
                      business._id,

                    phone:
                      normalizedPhone,

                    ownerToken:
                      conversationLockOwner!,

                    fenceToken:
                      conversationLockFenceToken!,

                    expiresAt: {
                      $gt:
                        new Date(),
                    },
                  })
                    .session(
                      session
                    )
                    .lean();

                if (!ownedLock) {
                  conversationLockLost =
                    true;

                  throw new Error(
                    "SMS conversation lock ownership was lost before appointment booking."
                  );
                }

                /* =======================================
                   CREATE APPOINTMENT INSIDE TRANSACTION
                   ======================================= */

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

                /* =======================================
                   FENCED LEAD BOOKING INSIDE TRANSACTION
                   ======================================= */

                const fencedBookedLead =
                  await updateLeadWithSmsFence({
                    leadId:
                      lead._id,

                    businessId:
                      business._id,

                    phone:
                      normalizedPhone,

                    fenceToken:
                      conversationLockFenceToken!,

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

                if (!fencedBookedLead) {
                  conversationLockLost =
                    true;

                  throw new Error(
                    "Stale SMS worker rejected while booking appointment."
                  );
                }

                lead =
                  fencedBookedLead;

                /* =======================================
                   CONFIRMATION MESSAGE INSIDE TRANSACTION
                   ======================================= */

                const createdMessages =
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

          /*
           * withTransaction() completed successfully.
           *
           * Appointment + Lead + confirmation Message now exist
           * together.
           */

          if (
            !appointment ||
            !aiMessage
          ) {
            throw new Error(
              "Appointment transaction completed without required records."
            );
          }

          /* =============================================
             VERIFY OWNERSHIP BEFORE EXTERNAL SMS
             ============================================= */

          await assertSmsConversationOwnership({
            businessId:
              business._id,

            phone:
              normalizedPhone,

            ownerToken:
              conversationLockOwner!,

            fenceToken:
              conversationLockFenceToken!,
          });

          /* =============================================
             SEND CONFIRMATION SMS
             ============================================= */

          try {
            await sendSmsReply({
              to:
                normalizedPhone,

              body:
                confirmation,
            });
          } catch (smsError) {
            console.error(
              "SMS appointment confirmation failed:",
              smsError
            );
          }

          /* =============================================
             EMAIL BUSINESS
             ============================================= */

          try {
            await sendAppointmentBookedEmail({
              businessEmail:
                business.email,

              businessName:
                business.name,

              appointmentId:
                appointment._id.toString(),

              name:
                lead.name ??
                null,

              phone:
                lead.phone ??
                null,

              service:
                lead.service ??
                null,

              location:
                lead.location ??
                null,

              appointmentLabel:
                selectedLabel,
            });
          } catch (emailError) {
            console.error(
              "SMS appointment email failed:",
              emailError
            );
          }

          console.log(
            "SMS appointment booked atomically:",
            {
              leadId:
                lead._id.toString(),

              appointmentId:
                appointment._id.toString(),

              service:
                lead.service,

              option:
                selectedOption,

              label:
                selectedLabel,

              scheduledFor:
                scheduledFor.toISOString(),

              smsConversationActive:
                lead.smsConversationActive,

              followUpEnabled:
                lead.followUp
                  ?.enabled,

              nextFollowUpAt:
                lead.followUp
                  ?.nextFollowUpAt,

              messageId:
                aiMessage._id.toString(),
            }
          );

          return successResponse();
        } catch (error) {
          /* =============================================
             DUPLICATE APPOINTMENT SLOT
        
             MongoDB transaction automatically rolls back the Lead
             update and confirmation Message as well.
             ============================================= */

          if (
            isMongoDuplicateKeyError(
              error
            )
          ) {
            console.log(
              "SMS appointment duplicate index conflict:",
              {
                leadId:
                  lead._id.toString(),

                option:
                  selectedOption,

                label:
                  selectedLabel,

                scheduledFor:
                  scheduledFor.toISOString(),
              }
            );

            await sendFreshSmsAppointmentOptions({
              lead,
              business,
              timeline,
              normalizedPhone,

              ownerToken:
                conversationLockOwner!,

              fenceToken:
                conversationLockFenceToken!,

              reason:
                `Sorry, ${selectedLabel} was just taken. Here are the latest available times:`,
            });

            return successResponse();
          }

          throw error;
        }
      }
    }

    /* =====================================================
       LOAD THIS LEAD'S CONVERSATION
       ===================================================== */

    const conversation =
      await Message.find({
        leadId:
          lead._id,
      })
        .sort({
          createdAt:
            1,
        })
        .lean();

    const messages =
      conversation.map(
        (message) => ({
          sender:
            message.sender ===
              "ai"
              ? ("ai" as const)
              : ("user" as const),

          text:
            message.content,
        })
      );

    /* =====================================================
       GENERATE AI QUALIFICATION RESPONSE
       ===================================================== */

    const result =
      await generateQualificationResponse(
        {
          messages,

          lead: {
            industry:
              lead.industry,

            service:
              lead.service,

            location:
              lead.location,

            urgency:
              lead.urgency,

            timeline:
              lead.timeline,

            name:
              lead.name,

            phone:
              lead.phone,
          },
        },

        {
          name:
            business.name,

          industry:
            business.industry,

          country:
            business.country ??
            "US",

          aiSettings,
        }
      );

    /* =====================================================
       QUALIFIED:
       GENERATE REAL APPOINTMENT OPTIONS
       ===================================================== */

    let offeredSmsSlots:
      GeneratedSlot[] = [];

    let shouldStoreSmsOptions =
      false;

    if (
      result.readyToBook &&
      result.lead.timeline
    ) {
      const timeline =
        result.lead
          .timeline as Timeline;

      if (
        VALID_TIMELINES.includes(
          timeline
        )
      ) {
        const availableSlots =
          await getSmsAvailableSlots({
            business,
            timeline,
          });

        const firstThreeSlots =
          availableSlots.slice(
            0,
            3
          );

        shouldStoreSmsOptions =
          true;

        offeredSmsSlots =
          firstThreeSlots;

        if (
          firstThreeSlots.length >
          0
        ) {
          const slotLines =
            firstThreeSlots
              .map(
                (
                  slot,
                  index
                ) =>
                  `${index + 1}. ${slot.label}`
              )
              .join("\n");

          const optionNumbers =
            firstThreeSlots
              .map(
                (
                  _,
                  index
                ) =>
                  index + 1
              )
              .join(", ");

          result.reply =
            `Great! Here are some available appointment times:\n\n${slotLines}\n\nReply with ${optionNumbers}.`;
        } else {
          result.reply =
            "You're qualified, but I couldn't find an available appointment time for your requested timeline. Please choose another day or timeframe.";
        }
      }
    }

    /* =====================================================
       UPDATE LEAD
       ===================================================== */

    lead.industry =
      result.lead.industry ??
      lead.industry;

    lead.service =
      result.lead.service ??
      lead.service;

    lead.location =
      result.lead.location ??
      lead.location;

    lead.urgency =
      result.lead.urgency ??
      lead.urgency;

    lead.timeline =
      result.lead.timeline ??
      lead.timeline;

    lead.name =
      result.lead.name ??
      lead.name;

    lead.phone =
      result.lead.phone ??
      lead.phone;

    if (
      lead.status !==
      "booked"
    ) {
      lead.status =
        result.readyToBook
          ? "qualified"
          : result.status;
    }

    if (
      ACTIVE_LEAD_STATUSES.includes(
        lead.status as
        | "new"
        | "warm"
        | "hot"
        | "qualified"
      )
    ) {
      lead.smsConversationActive =
        true;
    }

    /* =====================================================
       SCHEDULE FRESH FOLLOW-UP AFTER AI RESPONSE
       ===================================================== */

    if (
      canFollowUp(
        lead.status,
        lead.phone
      )
    ) {
      lead.followUp =
        lead.followUp ?? {};

      const followUpCount =
        lead.followUp.count ??
        0;

      lead.followUp.enabled =
        true;

      lead.followUp.nextFollowUpAt =
        getNextFollowUpAt(
          followUpCount
        );
    } else {
      lead.followUp =
        lead.followUp ?? {};

      lead.followUp.enabled =
        false;

      lead.followUp.nextFollowUpAt =
        null;
    }

    /* =====================================================
       STORE EXACT SMS APPOINTMENT OPTIONS
       ===================================================== */

    if (
      shouldStoreSmsOptions
    ) {
      lead.smsBookingOptions = {
        offeredAt:
          new Date(),

        slots:
          offeredSmsSlots.map(
            (slot) => ({
              label:
                slot.label,

              scheduledFor:
                new Date(
                  slot.scheduledFor
                ),
            })
          ),
      };
    } else if (
      !result.readyToBook
    ) {
      lead.smsBookingOptions = {
        offeredAt:
          null,

        slots:
          [],
      };
    }
    if (
      conversationLockFenceToken ===
      null
    ) {
      throw new Error(
        "Missing SMS conversation fence token."
      );
    }

    const fencedAiLead =
      await updateLeadWithSmsFence({
        leadId:
          lead._id,

        businessId:
          business._id,

        phone:
          normalizedPhone,

        fenceToken:
          conversationLockFenceToken,

        set: {
          industry:
            lead.industry,

          service:
            lead.service,

          location:
            lead.location,

          urgency:
            lead.urgency,

          timeline:
            lead.timeline,

          name:
            lead.name,

          phone:
            lead.phone,

          status:
            lead.status,

          smsConversationActive:
            lead.smsConversationActive,

          "followUp.enabled":
            lead.followUp
              ?.enabled ??
            false,

          "followUp.count":
            lead.followUp
              ?.count ??
            0,

          "followUp.nextFollowUpAt":
            lead.followUp
              ?.nextFollowUpAt ??
            null,

          "followUp.lastFollowUpAt":
            lead.followUp
              ?.lastFollowUpAt ??
            null,

          smsBookingOptions:
            lead.smsBookingOptions,
        },
      });

    if (!fencedAiLead) {
      conversationLockLost =
        true;

      throw new Error(
        "Stale SMS worker rejected while saving AI response."
      );
    }

    lead =
      fencedAiLead;


    /* =====================================================
       SAVE AI MESSAGE
       ===================================================== */

    const aiMessage =
      await Message.create({
        leadId:
          lead._id,

        sender:
          "ai",

        content:
          result.reply,
      });

    /* =====================================================
       OUTBOUND SMS
       ===================================================== */
    await assertSmsConversationOwnership({
      businessId:
        business._id,

      phone:
        normalizedPhone,

      ownerToken:
        conversationLockOwner!,

      fenceToken:
        conversationLockFenceToken!,
    });
    try {

      await sendSmsReply({
        to:
          normalizedPhone,

        body:
          result.reply,
      });
    } catch (smsError) {
      console.error(
        "SMS AI reply delivery failed:",
        smsError
      );
    }

    console.log(
      "SMS AI response generated:",
      {
        leadId:
          lead._id.toString(),

        service:
          lead.service,

        messageId:
          aiMessage._id.toString(),

        reply:
          result.reply,

        status:
          lead.status,

        readyToBook:
          result.readyToBook,

        smsConversationActive:
          lead.smsConversationActive,

        smsBookingOptions:
          lead.smsBookingOptions
            ?.slots?.map(
              (
                slot: {
                  label: string;
                  scheduledFor: Date;
                },
                index: number
              ) => ({
                option:
                  index + 1,

                label:
                  slot.label,

                scheduledFor:
                  slot.scheduledFor,
              })
            ),

        followUpEnabled:
          lead.followUp
            ?.enabled,

        followUpCount:
          lead.followUp
            ?.count,

        nextFollowUpAt:
          lead.followUp
            ?.nextFollowUpAt,
      }
    );

    return successResponse();
  } catch (error) {
    processingError =
      error;

    console.error(
      "Incoming SMS webhook error:",
      error
    );

    /*
     * Return a retryable error for unexpected failures.
     * The event is marked failed in finally, so a Twilio
     * retry can safely claim and process it again.
     */
    return retryResponse();
  } finally {
    /*
     * Stop scheduling new heartbeats before finalizing the
     * event and releasing the lock.
     */
    conversationLockRenewalStopped =
      true;

    if (
      conversationLockRenewalTimer
    ) {
      clearTimeout(
        conversationLockRenewalTimer
      );

      conversationLockRenewalTimer =
        null;
    }

    /*
     * If a renewal request is already in flight, wait for it
     * to settle before release so renew and release cannot
     * race each other.
     */
    if (
      conversationLockRenewalInFlight
    ) {
      try {
        await conversationLockRenewalInFlight;
      } catch {
        /*
         * The renewal loop records its own failure state.
         */
      }
    }

    /*
     * If ownership was lost, never mark this inbound event as
     * successfully processed.
     */
    if (
      conversationLockLost &&
      !processingError
    ) {
      processingError =
        new Error(
          "SMS conversation lock ownership was lost."
        );
    }

    /*
     * Mark the idempotency event BEFORE releasing the
     * conversation lock. A waiting retry can then acquire
     * the lock and see the final event state.
     */
    if (claimedMessageSid &&
      claimedProcessingToken) {
      try {
        if (processingError) {
          await TwilioInboundEvent.updateOne(
            {
              messageSid:
                claimedMessageSid,

              processingToken:
                claimedProcessingToken,

              status:
                "processing",
            },
            {
              $set: {
                status:
                  "failed",

                error:
                  getErrorMessage(
                    processingError
                  ),

                processedAt:
                  null,
              },
            }
          );
        } else {
          await TwilioInboundEvent.updateOne(
            {
              messageSid:
                claimedMessageSid,

              processingToken:
                claimedProcessingToken,

              status:
                "processing",
            },
            {
              $set: {
                status:
                  "processed",

                processedAt:
                  new Date(),

                error:
                  null,
              },
            }
          );
        }
      } catch (eventError) {
        console.error(
          "Failed to update Twilio inbound event status:",
          eventError
        );
      }
    }

    if (
      conversationLockOwner &&
      conversationLockFenceToken !==
      null &&
      conversationLockBusinessId &&
      conversationLockPhone
    ) {
      try {
        await releaseSmsConversationLock({
          businessId:
            conversationLockBusinessId,

          phone:
            conversationLockPhone,

          ownerToken:
            conversationLockOwner,

          fenceToken:
            conversationLockFenceToken,
        });
      } catch (lockError) {
        console.error(
          "Failed to release SMS conversation lock:",
          lockError
        );
      }
    }
  }
}

/* =========================================================
   TWILIO EVENT CLAIM / RETRY

   - first delivery: create "processing"
   - already processed: ignore
   - currently processing: ignore duplicate
   - failed or stale processing: atomically reclaim
   ========================================================= */

async function claimTwilioInboundEvent({
  messageSid,
  from,
  to,
  body,
}: {
  messageSid: string;
  from: string;
  to: string;
  body: string;
}) {
  const firstProcessingToken =
    randomUUID();

  try {
    await TwilioInboundEvent.create({
      messageSid,
      from,
      to,
      body,

      status:
        "processing",

      processingToken:
        firstProcessingToken,

      processedAt:
        null,

      error:
        null,
    });

    return {
      shouldProcess:
        true,

      processingToken:
        firstProcessingToken,
    };
  } catch (error) {
    if (
      !isMongoDuplicateKeyError(
        error
      )
    ) {
      throw error;
    }
  }

  const existing =
    await TwilioInboundEvent.findOne({
      messageSid,
    }).lean();

  if (!existing) {
    throw new Error(
      `Twilio event ${messageSid} exists but could not be loaded.`
    );
  }

  if (
    existing.status ===
    "processed"
  ) {
    return {
      shouldProcess:
        false,

      processingToken:
        null,
    };
  }

  const staleBefore =
    new Date(
      Date.now() -
      5 * 60 * 1000
    );

  if (
    existing.status ===
    "processing" &&
    existing.updatedAt &&
    new Date(
      existing.updatedAt
    ) >
    staleBefore
  ) {
    return {
      shouldProcess:
        false,

      processingToken:
        null,
    };
  }

  /*
   * Every reclaim gets a brand-new ownership token.
   */
  const reclaimedProcessingToken =
    randomUUID();

  const reclaimed =
    await TwilioInboundEvent.findOneAndUpdate(
      {
        messageSid,

        $or: [
          {
            status:
              "failed",
          },
          {
            status:
              "processing",

            updatedAt: {
              $lte:
                staleBefore,
            },
          },
        ],
      },

      {
        $set: {
          status:
            "processing",

          processingToken:
            reclaimedProcessingToken,

          processedAt:
            null,

          error:
            null,

          from,
          to,
          body,
        },
      },

      {
        returnDocument:
          "after",
      }
    );

  if (!reclaimed) {
    /*
     * Another worker reclaimed the event before us.
     */
    return {
      shouldProcess:
        false,

      processingToken:
        null,
    };
  }

  return {
    shouldProcess:
      true,

    processingToken:
      reclaimed.processingToken,
  };
}

/* =========================================================
   ERROR MESSAGE
   ========================================================= */

function getErrorMessage(
  error: unknown
) {
  if (
    error instanceof
    Error
  ) {
    return error.message.slice(
      0,
      2000
    );
  }

  return String(
    error
  ).slice(
    0,
    2000
  );
}

/* =========================================================
   RETRY RESPONSE
   ========================================================= */

function retryResponse() {
  return new NextResponse(
    "Temporary webhook processing failure",
    {
      status:
        503,

      headers: {
        "Content-Type":
          "text/plain",
      },
    }
  );
}

/* =========================================================
   RESTORE PREVIOUS SMS CONVERSATION

   Used only when an explicit service switch deactivated the
   current lead but could not activate the requested target.
   ========================================================= */

async function restorePreviousSmsConversation({
  leadId,
  businessId,
  phone,
  fenceToken,
}: {
  leadId: any;
  businessId: any;
  phone: string;
  fenceToken: number;
}) {
  try {
    const restored =
      await findOneAndUpdateLeadWithSmsFence({
        filter: {
          _id:
            leadId,

          businessId,

          phone,

          status: {
            $in:
              ACTIVE_LEAD_STATUSES,
          },
        },

        fenceToken,

        set: {
          smsConversationActive:
            true,
        },
      });

    if (!restored) {
      console.warn(
        "Previous SMS conversation was not restored because a newer fence exists.",
        {
          leadId:
            leadId.toString(),

          phone,

          fenceToken,
        }
      );
    }
  } catch (error) {
    console.error(
      "Failed to restore previous SMS conversation:",
      {
        leadId:
          leadId.toString(),

        phone,

        error,
      }
    );
  }
}

/* =========================================================
   ATOMIC SMS CONVERSATION ACTIVATION

   MongoDB's unique partial index guarantees that only one
   lead for the same business + phone can have:

   smsConversationActive = true

   If another webhook wins the race, MongoDB throws 11000.
   We catch that and load the winning conversation instead.
   ========================================================= */

async function activateSmsConversation({
  targetLeadId,
  businessId,
  phone,
  fenceToken,
}: {
  targetLeadId: any;
  businessId: any;
  phone: string;
  fenceToken: number;
}) {
  try {
    const activatedLead =
      await findOneAndUpdateLeadWithSmsFence({
        filter: {
          _id:
            targetLeadId,

          businessId,

          phone,

          status: {
            $in:
              ACTIVE_LEAD_STATUSES,
          },
        },

        fenceToken,

        set: {
          smsConversationActive:
            true,
        },
      });

    if (activatedLead) {
      return {
        lead:
          activatedLead,

        requestedLeadActivated:
          true,
      };
    }
  } catch (error) {
    if (
      !isMongoDuplicateKeyError(
        error
      )
    ) {
      throw error;
    }

    console.log(
      "Active SMS conversation duplicate-key race detected:",
      {
        targetLeadId:
          targetLeadId.toString(),

        phone,
      }
    );
  }

  /*
   * Either:
   *
   * 1. another worker activated a lead first, or
   * 2. the requested lead changed state before activation.
   *
   * Load the current database winner.
   */

  const activeLead =
    await Lead.findOne({
      businessId,

      phone,

      smsConversationActive:
        true,
    }).sort({
      updatedAt:
        -1,
    });

  if (!activeLead) {
    return null;
  }

  return {
    lead:
      activeLead,

    requestedLeadActivated:
      activeLead._id.toString() ===
      targetLeadId.toString(),
  };
}

/* =========================================================
   MONGODB DUPLICATE KEY CHECK
   ========================================================= */

function isMongoDuplicateKeyError(
  error: unknown
): error is {
  code: number;
} {
  return (
    typeof error ===
    "object" &&
    error !==
    null &&
    "code" in
    error &&
    (error as {
      code?: number;
    }).code ===
    11000
  );
}

/* =========================================================
   SERVICE MATCHING
   ========================================================= */

function findLeadByService(
  leads: any[],
  message: string
) {
  const normalizedMessage =
    normalizeText(message);

  if (!normalizedMessage) {
    return null;
  }

  const matches =
    leads.filter((lead) => {
      if (!lead.service) {
        return false;
      }

      const normalizedService =
        normalizeText(
          lead.service
        );

      if (!normalizedService) {
        return false;
      }

      if (
        normalizedMessage ===
        normalizedService
      ) {
        return true;
      }

      if (
        normalizedMessage.includes(
          normalizedService
        )
      ) {
        return true;
      }

      const serviceWords =
        normalizedService
          .split(" ")
          .filter(
            (word) =>
              word.length >=
              2
          );

      if (
        serviceWords.length ===
        0
      ) {
        return false;
      }

      return serviceWords.every(
        (word) =>
          normalizedMessage.includes(
            word
          )
      );
    });

  if (
    matches.length !==
    1
  ) {
    return null;
  }

  return matches[0];
}

/* =========================================================
   TEXT NORMALIZATION
   ========================================================= */

function normalizeText(
  value: string
) {
  return value
    .toLowerCase()
    .replace(
      /[^a-z0-9\s]/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

/* =========================================================
   TWIML RESPONSE
   ========================================================= */

function twimlResponse() {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`,
    {
      status:
        200,

      headers: {
        "Content-Type":
          "text/xml",
      },
    }
  );
}

/* =========================================================
   FORBIDDEN RESPONSE
   ========================================================= */

function forbiddenResponse() {
  return new NextResponse(
    "Forbidden",
    {
      status:
        403,

      headers: {
        "Content-Type":
          "text/plain",
      },
    }
  );
}

/* =========================================================
   SEND FRESH SMS APPOINTMENT OPTIONS
   ========================================================= */

async function sendFreshSmsAppointmentOptions({
  lead,
  business,
  timeline,
  normalizedPhone,
  ownerToken,
  fenceToken,
  reason,
}: {
  lead: any;
  business: any;
  timeline: Timeline;
  normalizedPhone: string;
  ownerToken: string;
  fenceToken: number;
  reason: string;
}) {
  const availableSlots =
    await getSmsAvailableSlots({
      business,
      timeline,
    });

  const firstThreeSlots =
    availableSlots.slice(
      0,
      3
    );

  let reply =
    reason;

  if (
    firstThreeSlots.length >
    0
  ) {
    const slotLines =
      firstThreeSlots
        .map(
          (
            slot,
            index
          ) =>
            `${index + 1}. ${slot.label}`
        )
        .join("\n");

    const optionNumbers =
      firstThreeSlots
        .map(
          (
            _,
            index
          ) =>
            index + 1
        )
        .join(", ");

    reply =
      `${reason}\n\n${slotLines}\n\nReply with ${optionNumbers}.`;
  } else {
    reply =
      `${reason}\n\nI couldn't find another available appointment time for this timeframe. Please reply with another day or timeframe.`;
  }

  /* =======================================================
     STORE NEW EXACT OPTIONS
     ======================================================= */

  lead.smsBookingOptions = {
    offeredAt:
      new Date(),

    slots:
      firstThreeSlots.map(
        (slot) => ({
          label:
            slot.label,

          scheduledFor:
            new Date(
              slot.scheduledFor
            ),
        })
      ),
  };

  /* =======================================================
     RESCHEDULE FOLLOW-UP
     ======================================================= */

  if (
    canFollowUp(
      lead.status,
      lead.phone
    )
  ) {
    lead.followUp =
      lead.followUp ?? {};

    const followUpCount =
      lead.followUp.count ??
      0;

    lead.followUp.enabled =
      true;

    lead.followUp.nextFollowUpAt =
      getNextFollowUpAt(
        followUpCount
      );
  } else {
    lead.followUp =
      lead.followUp ?? {};

    lead.followUp.enabled =
      false;

    lead.followUp.nextFollowUpAt =
      null;
  }

  const fencedLead =
    await updateLeadWithSmsFence({
      leadId:
        lead._id,

      businessId:
        business._id,

      phone:
        normalizedPhone,

      fenceToken,

      set: {
        smsBookingOptions:
          lead.smsBookingOptions,

        "followUp.enabled":
          lead.followUp
            ?.enabled ??
          false,

        "followUp.count":
          lead.followUp
            ?.count ??
          0,

        "followUp.nextFollowUpAt":
          lead.followUp
            ?.nextFollowUpAt ??
          null,

        "followUp.lastFollowUpAt":
          lead.followUp
            ?.lastFollowUpAt ??
          null,
      },
    });

  if (!fencedLead) {
    throw new Error(
      "Stale SMS worker rejected while refreshing appointment options."
    );
  }

  lead =
    fencedLead;

  /* =======================================================
     SAVE AI MESSAGE
     ======================================================= */

  const aiMessage =
    await Message.create({
      leadId:
        lead._id,

      sender:
        "ai",

      content:
        reply,
    });

  /* =======================================================
     VERIFY OWNERSHIP BEFORE OUTBOUND SMS
     ======================================================= */

  await assertSmsConversationOwnership({
    businessId:
      business._id,

    phone:
      normalizedPhone,

    ownerToken,

    fenceToken,
  });

  /* =======================================================
     SEND SMS
     ======================================================= */

  try {
    await sendSmsReply({
      to:
        normalizedPhone,

      body:
        reply,
    });
  } catch (smsError) {
    console.error(
      "Fresh SMS appointment options delivery failed:",
      smsError
    );
  }

  console.log(
    "Fresh SMS appointment options sent:",
    {
      leadId:
        lead._id.toString(),

      slots:
        firstThreeSlots.map(
          (
            slot,
            index
          ) => ({
            option:
              index + 1,

            label:
              slot.label,

            scheduledFor:
              slot.scheduledFor,
          })
        ),

      followUpEnabled:
        lead.followUp
          ?.enabled,

      followUpCount:
        lead.followUp
          ?.count,

      nextFollowUpAt:
        lead.followUp
          ?.nextFollowUpAt,

      messageId:
        aiMessage._id.toString(),
    }
  );
}

/* =========================================================
   SMS AVAILABILITY
   ========================================================= */

async function getSmsAvailableSlots({
  business,
  timeline,
}: {
  business: any;
  timeline: Timeline;
}): Promise<GeneratedSlot[]> {
  const timezone =
    business.timezone ??
    "America/Chicago";

  const availability =
    business.availability;

  if (
    !availability ||
    !availability.days
      ?.length
  ) {
    return [];
  }

  const dates =
    getDatesForTimeline(
      timeline,
      timezone
    );

  const now =
    new Date();

  const slots: GeneratedSlot[] =
    [];

  for (
    const localDate of dates
  ) {
    const dayName =
      getDayName(
        localDate
      );

    const dayAvailability =
      availability.days.find(
        (
          item: AvailabilityDay
        ) =>
          item.day ===
          dayName
      );

    if (!dayAvailability) {
      continue;
    }

    const generatedSlots =
      generateSlotsForDate(
        localDate,
        dayAvailability,
        availability
          .slotDurationMinutes ??
        60,
        availability
          .bufferMinutes ??
        0,
        timezone,
        now
      );

    slots.push(
      ...generatedSlots
    );
  }

  if (
    slots.length ===
    0
  ) {
    return [];
  }

  const scheduledAppointments =
    await Appointment.find({
      businessId:
        business._id,

      status: {
        $in: [
          "scheduled",
          "confirmed",
        ],
      },

      scheduledFor: {
        $in:
          slots.map(
            (slot) =>
              new Date(
                slot.scheduledFor
              )
          ),
      },
    })
      .select(
        "scheduledFor"
      )
      .lean();

  const bookedTimes =
    new Set(
      scheduledAppointments.map(
        (appointment) =>
          new Date(
            appointment.scheduledFor
          ).getTime()
      )
    );

  return slots.filter(
    (slot) =>
      !bookedTimes.has(
        new Date(
          slot.scheduledFor
        ).getTime()
      )
  );
}

async function assertSmsConversationOwnership({
  businessId,
  phone,
  ownerToken,
  fenceToken,
}: {
  businessId: any;
  phone: string;
  ownerToken: string;
  fenceToken: number;
}) {
  const ownsLock =
    await checkSmsConversationLock({
      businessId,
      phone,
      ownerToken,
      fenceToken,
    });

  if (!ownsLock) {
    throw new Error(
      "SMS conversation lock ownership was lost before side effect."
    );
  }
}


function findConfiguredService(
  services: string[],
  message: string
): string | null {
  const normalizedMessage =
    normalizeText(message);

  if (!normalizedMessage) {
    return null;
  }

  const matches =
    services.filter((service) => {
      const normalizedService =
        normalizeText(service);

      if (!normalizedService) {
        return false;
      }

      if (
        normalizedMessage ===
        normalizedService
      ) {
        return true;
      }

      if (
        normalizedMessage.includes(
          normalizedService
        )
      ) {
        return true;
      }

      const serviceWords =
        normalizedService
          .split(" ")
          .filter(
            (word) =>
              word.length >= 2
          );

      if (
        serviceWords.length ===
        0
      ) {
        return false;
      }

      return serviceWords.every(
        (word) =>
          normalizedMessage.includes(
            word
          )
      );
    });

  /*
   * Do not guess when multiple configured
   * services match the same message.
   */
  if (matches.length !== 1) {
    return null;
  }

  return matches[0];
}