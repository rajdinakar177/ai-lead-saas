import { assertSmsConversationOwnership } from "@/lib/sms/incoming/lock-ownership";
import { sendSmsReply } from "@/lib/sms/send-sms-reply";
import { sendAppointmentBookedEmail } from "@/lib/email/send-appointment-booked-email";
import { safeLogger } from "@/lib/security/safe-logger";

type SendSmsAppointmentNotificationsParams = {
  business: any;
  lead: any;
  appointment: any;

  normalizedPhone: string;

  ownerToken: string;
  fenceToken: number;

  confirmation: string;
};

export async function sendSmsAppointmentNotifications({
  business,
  lead,
  appointment,
  normalizedPhone,
  ownerToken,
  fenceToken,
  confirmation,
}: SendSmsAppointmentNotificationsParams) {
  /* =====================================================
       VERIFY OWNERSHIP BEFORE CUSTOMER SMS
       ===================================================== */

  await assertSmsConversationOwnership({
    businessId: business._id,

    phone: normalizedPhone,

    ownerToken,

    fenceToken,
  });

  /* =====================================================
       SEND CUSTOMER SMS
       ===================================================== */

  try {
    await sendSmsReply({
      business,
      to: normalizedPhone,
      body: confirmation,
    });
  } catch (smsError) {
    safeLogger.error(
      "SMS appointment confirmation delivery failed.",
      smsError,
      {
        businessId: business._id.toString(),
        appointmentId: appointment._id.toString(),
        leadId: lead._id.toString(),
      },
    );
  }

  /* =====================================================
       VERIFY OWNERSHIP AGAIN BEFORE EMAIL
       ===================================================== */

  await assertSmsConversationOwnership({
    businessId: business._id,

    phone: normalizedPhone,

    ownerToken,

    fenceToken,
  });

  /* =====================================================
       SEND BUSINESS EMAIL
       ===================================================== */

  try {
    await sendAppointmentBookedEmail({
      businessEmail: business.email,

      businessName: business.name,

      appointmentId: appointment._id.toString(),

      name: lead.name,

      phone: lead.phone,

      service: lead.service,

      location: lead.location,

      appointmentLabel: appointment.label,
    });
  } catch (emailError) {
    safeLogger.error("SMS appointment booked email failed.", emailError, {
      businessId: business._id.toString(),
      appointmentId: appointment._id.toString(),
      leadId: lead._id.toString(),
    });
  }
}
