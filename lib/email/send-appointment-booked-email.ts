import { generateAppointmentBookedEmail } from "@/lib/email/appointment-booked-email";
import { sendEmail } from "@/lib/email/send-email";

type SendAppointmentBookedEmailParams = {
  businessEmail: string;
  businessName: string;

  appointmentId: string;

  name?: string | null;
  phone?: string | null;
  service?: string | null;
  location?: string | null;

  appointmentLabel: string;
};

export async function sendAppointmentBookedEmail({
  businessEmail,
  businessName,
  appointmentId,
  name,
  phone,
  service,
  location,
  appointmentLabel,
}: SendAppointmentBookedEmailParams) {
  const email =
    generateAppointmentBookedEmail({
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