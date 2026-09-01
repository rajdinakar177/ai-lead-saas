import { generateNewLeadEmail } from "@/lib/email/new-lead-email";
import { sendEmail } from "@/lib/email/send-email";

type SendNewLeadEmailParams = {
  businessEmail: string;
  businessName: string;

  leadId: string;

  name?: string | null;
  phone?: string | null;
  service?: string | null;
  location?: string | null;
  urgency?: string | null;
  timeline?: string | null;
};

export async function sendNewLeadEmail({
  businessEmail,
  businessName,
  leadId,
  name,
  phone,
  service,
  location,
  urgency,
  timeline,
}: SendNewLeadEmailParams) {
  const email = generateNewLeadEmail({
    businessName,
    leadId,
    name,
    phone,
    service,
    location,
    urgency,
    timeline,
  });

  return sendEmail({
    toEmail: businessEmail,
    toName: businessName,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}