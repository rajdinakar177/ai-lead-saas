import type { Timeline } from "@/lib/availability";

import { canFollowUp, getNextFollowUpAt } from "@/lib/follow-up";

import { updateLeadWithSmsFence } from "@/lib/sms/sms-fenced-lead";
import { sendSmsReply } from "@/lib/sms/send-sms-reply";

import { Message } from "@/models/Message";

import { getSmsAvailableSlots } from "@/lib/sms/incoming/appointment-availability";
import { assertSmsConversationOwnership } from "@/lib/sms/incoming/lock-ownership";

/* =========================================================
   SEND FRESH SMS APPOINTMENT OPTIONS
   ========================================================= */

export async function sendFreshSmsAppointmentOptions({
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
  const availableSlots = await getSmsAvailableSlots({
    business,
    timeline,
  });

  const firstThreeSlots = availableSlots.slice(0, 3);

  let reply = reason;

  if (firstThreeSlots.length > 0) {
    const slotLines = firstThreeSlots
      .map((slot, index) => `${index + 1}. ${slot.label}`)
      .join("\n");

    const optionNumbers = firstThreeSlots
      .map((_, index) => index + 1)
      .join(", ");

    reply = `${reason}\n\n${slotLines}\n\nReply with ${optionNumbers}.`;
  } else {
    reply = `${reason}\n\nI couldn't find another available appointment time for this timeframe. Please reply with another day or timeframe.`;
  }

  /* =======================================================
     STORE NEW EXACT OPTIONS
     ======================================================= */

  lead.smsBookingOptions = {
    offeredAt: new Date(),

    slots: firstThreeSlots.map((slot) => ({
      label: slot.label,

      scheduledFor: new Date(slot.scheduledFor),
    })),
  };

  /* =======================================================
     RESCHEDULE FOLLOW-UP
     ======================================================= */

  if (canFollowUp(lead.status, lead.phone)) {
    lead.followUp = lead.followUp ?? {};

    const followUpCount = lead.followUp.count ?? 0;

    lead.followUp.enabled = true;

    lead.followUp.nextFollowUpAt = getNextFollowUpAt(followUpCount);
  } else {
    lead.followUp = lead.followUp ?? {};

    lead.followUp.enabled = false;

    lead.followUp.nextFollowUpAt = null;
  }

  /* =======================================================
     FENCED LEAD UPDATE
     ======================================================= */

  const fencedLead = await updateLeadWithSmsFence({
    leadId: lead._id,

    businessId: business._id,

    phone: normalizedPhone,

    fenceToken,

    set: {
      smsBookingOptions: lead.smsBookingOptions,

      "followUp.enabled": lead.followUp?.enabled ?? false,

      "followUp.count": lead.followUp?.count ?? 0,

      "followUp.nextFollowUpAt": lead.followUp?.nextFollowUpAt ?? null,

      "followUp.lastFollowUpAt": lead.followUp?.lastFollowUpAt ?? null,
    },
  });

  if (!fencedLead) {
    throw new Error(
      "Stale SMS worker rejected while refreshing appointment options.",
    );
  }

  lead = fencedLead;

  /* =======================================================
     SAVE AI MESSAGE
     ======================================================= */

  const aiMessage = await Message.create({
    leadId: lead._id,

    sender: "ai",

    content: reply,
  });

  /* =======================================================
     VERIFY OWNERSHIP BEFORE OUTBOUND SMS
     ======================================================= */

  await assertSmsConversationOwnership({
    businessId: business._id,

    phone: normalizedPhone,

    ownerToken,

    fenceToken,
  });

  /* =======================================================
     SEND SMS
     ======================================================= */

  try {
    await sendSmsReply({
      to: normalizedPhone,

      body: reply,
    });
  } catch (smsError) {
    console.error("Fresh SMS appointment options delivery failed:", smsError);
  }

  console.log("Fresh SMS appointment options sent:", {
    leadId: lead._id.toString(),

    slots: firstThreeSlots.map((slot, index) => ({
      option: index + 1,

      label: slot.label,

      scheduledFor: slot.scheduledFor,
    })),

    followUpEnabled: lead.followUp?.enabled,

    followUpCount: lead.followUp?.count,

    nextFollowUpAt: lead.followUp?.nextFollowUpAt,

    messageId: aiMessage._id.toString(),
  });
}
