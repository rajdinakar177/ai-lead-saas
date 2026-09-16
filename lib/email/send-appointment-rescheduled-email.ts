import { generateAppointmentRescheduledEmail } from "@/lib/email/appointment-rescheduled-email";

import { sendEmail } from "@/lib/email/send-email";

type SendAppointmentRescheduledEmailParams = {
  businessEmail: string;
  businessName: string;

  appointmentId: string;

  name?: string | null;
  phone?: string | null;
  service?: string | null;
  location?: string | null;

  previousAppointmentLabel: string;
  newAppointmentLabel: string;
};

export async function sendAppointmentRescheduledEmail({
  businessEmail,
  businessName,
  appointmentId,
  name,
  phone,
  service,
  location,
  previousAppointmentLabel,
  newAppointmentLabel,
}: SendAppointmentRescheduledEmailParams) {
  const email =
    generateAppointmentRescheduledEmail({
      businessName,
      appointmentId,
      name,
      phone,
      service,
      location,
      previousAppointmentLabel,
      newAppointmentLabel,
    });

  return sendEmail({
    toEmail: businessEmail,
    toName: businessName,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}