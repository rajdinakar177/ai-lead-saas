import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { validatePhoneNumber } from "@/lib/phone";
import { verifyTwilioSignature } from "@/lib/sms/verify-twilio-signature";

import {
  generateQualificationResponse,
  type AISettings,
} from "@/lib/ai/qualification";

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

/* =========================================================
   POST
   ========================================================= */

export async function POST(
  request: Request
) {
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
            url:
              webhookUrl,
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
      return twimlResponse();
    }

    await connectDB();

    /* =====================================================
       MESSAGE SID IDEMPOTENCY
       ===================================================== */

    try {
      await TwilioInboundEvent.create({
        messageSid,
        from,
        to,
        body,
        status: "processing",
      });
    } catch (error) {
      if (
        typeof error ===
          "object" &&
        error !== null &&
        "code" in error &&
        error.code ===
          11000
      ) {
        console.log(
          "Duplicate Twilio webhook ignored:",
          messageSid
        );

        return twimlResponse();
      }

      throw error;
    }

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

      return twimlResponse();
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

      return twimlResponse();
    }

    const normalizedPhone =
      phoneResult.normalized;

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

      return twimlResponse();
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
        lead =
          openLeads[0];

        lead.smsConversationActive =
          true;

        await lead.save();

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
          await Lead.updateMany(
            {
              businessId:
                business._id,

              phone:
                normalizedPhone,
            },
            {
              $set: {
                smsConversationActive:
                  false,
              },
            }
          );

          matchedLead.smsConversationActive =
            true;

          await matchedLead.save();

          lead =
            matchedLead;

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

          return twimlResponse();
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
          await Lead.updateMany(
            {
              businessId:
                business._id,

              phone:
                normalizedPhone,

              smsConversationActive:
                true,
            },
            {
              $set: {
                smsConversationActive:
                  false,
              },
            }
          );

          lead =
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
            });

          /* ===============================================
             SCHEDULE FOLLOW-UP FOR NEW SMS LEAD
             =============================================== */

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

          await lead.save();

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

          return twimlResponse();
        }

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

        return twimlResponse();
      }
    }

    /* =====================================================
       ACTIVE LEAD IS NOW RESOLVED
       ===================================================== */

    if (!lead) {
      console.warn(
        "Unable to resolve SMS lead."
      );

      return twimlResponse();
    }

    /* =====================================================
       CUSTOMER REPLIED

       Cancel previous follow-up timer.
       A new one will be scheduled after AI response.
       ===================================================== */

    lead.followUp =
      lead.followUp ?? {};

    lead.followUp.nextFollowUpAt =
      null;

    await lead.save();

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

       IMPORTANT:
       Numeric choices use the exact appointment slots that
       were previously sent to the customer.

       We never regenerate the array and reinterpret the
       customer's number.
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

           Customer may be replying to an older message.
           Send a fresh set of appointment options.
           =============================================== */

        if (!storedSlot) {
          await sendFreshSmsAppointmentOptions({
            lead,
            business,
            timeline,
            normalizedPhone,

            reason:
              "Those appointment options are no longer current. Here are the latest available times:",
          });

          return twimlResponse();
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

            reason:
              `Sorry, ${selectedLabel} is no longer available. Here are the latest available times:`,
          });

          return twimlResponse();
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

            reason:
              `Sorry, ${selectedLabel} was just taken. Here are the latest available times:`,
          });

          return twimlResponse();
        }

        try {
          /* =============================================
             CREATE APPOINTMENT
             ============================================= */

          const appointment =
            await Appointment.create({
              leadId:
                lead._id,

              businessId:
                lead.businessId,

              label:
                selectedLabel,

              scheduledFor,

              status:
                "scheduled",
            });

          /* =============================================
             BOOK LEAD + STOP FOLLOW-UPS
             ============================================= */

          lead.status =
            "booked";

          lead.smsConversationActive =
            false;

          lead.followUp =
            lead.followUp ?? {};

          lead.followUp.enabled =
            false;

          lead.followUp.nextFollowUpAt =
            null;

          /* =============================================
             CLEAR USED SMS BOOKING OPTIONS
             ============================================= */

          lead.smsBookingOptions = {
            offeredAt:
              null,

            slots:
              [],
          };

          await lead.save();

          /* =============================================
             CONFIRMATION MESSAGE
             ============================================= */

          const confirmation =
            `Perfect! We've reserved ${selectedLabel}.`;

          const aiMessage =
            await Message.create({
              leadId:
                lead._id,

              sender:
                "ai",

              content:
                confirmation,
            });

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
            "SMS appointment booked:",
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

          return twimlResponse();
        } catch (error) {
          /* =============================================
             DUPLICATE SLOT INDEX CONFLICT

             Protects against another booking happening
             between our availability check and create().
             ============================================= */

          if (
            typeof error ===
              "object" &&
            error !== null &&
            "code" in error &&
            error.code ===
              11000
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

              reason:
                `Sorry, ${selectedLabel} was just taken. Here are the latest available times:`,
            });

            return twimlResponse();
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

       We will store the EXACT options sent to the customer.
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

       These are the exact options shown to the customer.
       Later 1 / 2 / 3 maps back to these timestamps.
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

    await lead.save();

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

    return twimlResponse();
  } catch (error) {
    console.error(
      "Incoming SMS webhook error:",
      error
    );

    return twimlResponse();
  }
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

   Used when:
   - customer replies to an old appointment list
   - selected slot became unavailable
   - slot became occupied during booking
   - MongoDB unique index detects a booking race

   This function:
   1. generates fresh availability
   2. stores the exact new slots
   3. sends the new choices
   4. reschedules the follow-up
   ========================================================= */

async function sendFreshSmsAppointmentOptions({
  lead,
  business,
  timeline,
  normalizedPhone,
  reason,
}: {
  lead: any;
  business: any;
  timeline: Timeline;
  normalizedPhone: string;
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

  await lead.save();

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