import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { validatePhoneNumber } from "@/lib/phone";

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

import { Lead } from "@/models/Lead";
import { Business } from "@/models/Business";
import { Message } from "@/models/Message";
import { Appointment } from "@/models/Appointment";

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
        from,
        to,
        body,
      }
    );

    /* =====================================================
       REQUIRED FIELDS
       ===================================================== */

    if (
      !from ||
      !to ||
      !body
    ) {
      return twimlResponse();
    }

    await connectDB();

    /* =====================================================
       VERIFY TWILIO NUMBER

       DEVELOPMENT:
       Currently one Twilio number
       from .env.local.

       Later:
       Twilio number -> Business
       ===================================================== */

    const twilioPhoneNumber =
      process.env
        .TWILIO_PHONE_NUMBER;

    if (
      !twilioPhoneNumber ||
      to !== twilioPhoneNumber
    ) {
      console.warn(
        "Unknown Twilio number:",
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
       FIND LEAD

       DEVELOPMENT:
       Finds latest lead by customer phone.

       Later production routing:
       business Twilio number + customer phone
       ===================================================== */

    const lead =
      await Lead.findOne({
        phone:
          normalizedPhone,
      }).sort({
        createdAt: -1,
      });

    if (!lead) {
      console.warn(
        "No lead found for incoming SMS:",
        normalizedPhone
      );

      return twimlResponse();
    }

    /* =====================================================
       FIND BUSINESS
       ===================================================== */

    const business =
      await Business.findById(
        lead.businessId
      ).lean();

    if (!business) {
      console.warn(
        "Business not found for lead:",
        lead._id.toString()
      );

      return twimlResponse();
    }

    /* =====================================================
       SAVE INCOMING CUSTOMER SMS
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
      }
    );

    /* =====================================================
       STAGE 4.9
       SMS APPOINTMENT SELECTION

       Customer replies:
       1
       2
       3
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
      const validTimelines: Timeline[] =
        [
          "Today",
          "Tomorrow",
          "This week",
          "Next week",
        ];

      const timeline =
        lead.timeline as Timeline;

      if (
        validTimelines.includes(
          timeline
        )
      ) {
        /* ---------------------------------
           Regenerate current availability
           --------------------------------- */

        const availableSlots =
          await getSmsAvailableSlots({
            business,
            timeline,
          });

        const smsSlots =
          availableSlots.slice(
            0,
            3
          );

        const selectedSlot =
          smsSlots[
            selectedOption - 1
          ];

        /* ---------------------------------
           Invalid / disappeared option
           --------------------------------- */

        if (!selectedSlot) {
          const unavailableReply =
            "That option is no longer available. Please choose one of the currently available appointment times.";

          await Message.create({
            leadId:
              lead._id,

            sender:
              "ai",

            content:
              unavailableReply,
          });

          try {
            await sendSmsReply({
              to:
                normalizedPhone,

              body:
                unavailableReply,
            });
          } catch (smsError) {
            console.error(
              "SMS unavailable-slot reply failed:",
              smsError
            );
          }

          return twimlResponse();
        }

        const scheduledFor =
          new Date(
            selectedSlot.scheduledFor
          );

        /* ---------------------------------
           Final conflict check
           --------------------------------- */

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

        if (existingAppointment) {
          const conflictReply =
            "That appointment time was just taken. Please choose another available time.";

          await Message.create({
            leadId:
              lead._id,

            sender:
              "ai",

            content:
              conflictReply,
          });

          try {
            await sendSmsReply({
              to:
                normalizedPhone,

              body:
                conflictReply,
            });
          } catch (smsError) {
            console.error(
              "SMS conflict reply delivery failed:",
              smsError
            );
          }

          return twimlResponse();
        }

        /* ---------------------------------
           Create appointment
           --------------------------------- */

        try {
          const appointment =
            await Appointment.create({
              leadId:
                lead._id,

              businessId:
                lead.businessId,

              label:
                selectedSlot.label,

              scheduledFor,

              status:
                "scheduled",
            });

          /* ---------------------------------
             Mark lead booked
             --------------------------------- */

          lead.status =
            "booked";

          await lead.save();

          /* ---------------------------------
             Appointment confirmation
             --------------------------------- */

          const confirmation =
            `Perfect! We've reserved ${selectedSlot.label}.`;

          const aiMessage =
            await Message.create({
              leadId:
                lead._id,

              sender:
                "ai",

              content:
                confirmation,
            });

          /* ---------------------------------
             SMS delivery layer
             --------------------------------- */

          try {
            await sendSmsReply({
              to:
                normalizedPhone,

              body:
                confirmation,
            });
          } catch (smsError) {
            console.error(
              "SMS appointment confirmation delivery failed:",
              smsError
            );
          }

          /* ---------------------------------
             Business email notification
             --------------------------------- */

          try {
            await sendAppointmentBookedEmail({
              businessEmail:
                business.email,

              businessName:
                business.name,

              appointmentId:
                appointment._id.toString(),

              name:
                lead.name ?? null,

              phone:
                lead.phone ?? null,

              service:
                lead.service ?? null,

              location:
                lead.location ?? null,

              appointmentLabel:
                selectedSlot.label,
            });
          } catch (
            emailError
          ) {
            console.error(
              "SMS appointment email notification failed:",
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

              option:
                selectedOption,

              label:
                selectedSlot.label,

              scheduledFor:
                selectedSlot.scheduledFor,

              messageId:
                aiMessage._id.toString(),
            }
          );

          return twimlResponse();
        } catch (error) {
          /* ---------------------------------
             MongoDB unique index race
             protection
             --------------------------------- */

          if (
            typeof error ===
              "object" &&
            error !== null &&
            "code" in error &&
            error.code ===
              11000
          ) {
            const conflictReply =
              "That appointment time was just taken. Please choose another available time.";

            await Message.create({
              leadId:
                lead._id,

              sender:
                "ai",

              content:
                conflictReply,
            });

            try {
              await sendSmsReply({
                to:
                  normalizedPhone,

                body:
                  conflictReply,
              });
            } catch (
              smsError
            ) {
              console.error(
                "SMS duplicate-slot reply delivery failed:",
                smsError
              );
            }

            return twimlResponse();
          }

          throw error;
        }
      }
    }

    /* =====================================================
       LOAD CONVERSATION HISTORY
       ===================================================== */

    const conversation =
      await Message.find({
        leadId:
          lead._id,
      })
        .sort({
          createdAt: 1,
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
       BUSINESS AI SETTINGS
       ===================================================== */

    const aiSettings: AISettings =
      {
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
       GENERATE SHARED AI RESPONSE
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
       QUALIFIED LEAD
       GENERATE REAL APPOINTMENT OPTIONS
       ===================================================== */

    if (
      result.readyToBook &&
      result.lead.timeline
    ) {
      const validTimelines: Timeline[] =
        [
          "Today",
          "Tomorrow",
          "This week",
          "Next week",
        ];

      const timeline =
        result.lead
          .timeline as Timeline;

      if (
        validTimelines.includes(
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
       UPDATE LEAD QUALIFICATION DATA
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

    /*
     * Never accidentally downgrade
     * an already-booked lead back
     * to qualified/hot/warm.
     */
    if (
      lead.status !==
      "booked"
    ) {
      lead.status =
        result.readyToBook
          ? "qualified"
          : result.status;
    }

    await lead.save();

    /* =====================================================
       SAVE AI RESPONSE
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
       SEND AI RESPONSE THROUGH SMS DELIVERY LAYER

       SMS_MODE=mock
       -> console only

       SMS_MODE=twilio
       -> real Twilio
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

        messageId:
          aiMessage._id.toString(),

        reply:
          result.reply,

        status:
          lead.status,

        readyToBook:
          result.readyToBook,
      }
    );

    return twimlResponse();
  } catch (error) {
    console.error(
      "Incoming SMS webhook error:",
      error
    );

    /*
     * Return TwiML instead of
     * throwing HTML/JSON back
     * to Twilio.
     */
    return twimlResponse();
  }
}

/* =========================================================
   EMPTY TWIML RESPONSE
   ========================================================= */

function twimlResponse() {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`,
    {
      status: 200,

      headers: {
        "Content-Type":
          "text/xml",
      },
    }
  );
}

/* =========================================================
   SMS AVAILABILITY

   Same rules as website availability:
   - business timezone
   - business working hours
   - slot duration
   - buffer
   - remove scheduled/confirmed appointments
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
    !availability.days?.length
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
        availability.slotDurationMinutes ??
          60,
        availability.bufferMinutes ??
          0,
        timezone,
        now
      );

    slots.push(
      ...generatedSlots
    );
  }

  if (
    slots.length === 0
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
        (
          appointment
        ) =>
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