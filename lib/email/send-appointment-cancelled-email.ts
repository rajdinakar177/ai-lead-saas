import { generateAppointmentCancelledEmail } from "@/lib/email/appointment-cancelled-email";

import { sendEmail } from "@/lib/email/send-email";

type SendAppointmentCancelledEmailParams = {
  businessEmail: string;
  businessName: string;

  appointmentId: string;

  name?: string | null;
  phone?: string | null;
  service?: string | null;
  location?: string | null;

  appointmentLabel: string;
};

export async function sendAppointmentCancelledEmail({
  businessEmail,
  businessName,
  appointmentId,
  name,
  phone,
  service,
  location,
  appointmentLabel,
}: SendAppointmentCancelledEmailParams) {
  const email = generateAppointmentCancelledEmail({
    businessName,
    appointmentId,
    name,
    phone,
    service,
    location,
    appointmentLabel,
  });

  return sendEmail({
    toEmail: businessEmail,
    toName: businessName,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}
