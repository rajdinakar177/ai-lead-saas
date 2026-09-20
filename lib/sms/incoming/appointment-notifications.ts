import { assertSmsConversationOwnership } from "@/lib/sms/incoming/lock-ownership";
import { sendSmsReply } from "@/lib/sms/send-sms-reply";
import { sendAppointmentBookedEmail } from "@/lib/email/send-appointment-booked-email";

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
      to: normalizedPhone,

      body: confirmation,
    });
  } catch (smsError) {
    console.error("SMS appointment confirmation delivery failed:", smsError);
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
    console.error("SMS appointment booked email failed:", emailError);
  }
}
