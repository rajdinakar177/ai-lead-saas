import { mailGenerator } from "@/lib/email/mailgen";

type GenerateAppointmentRescheduledEmailParams = {
  businessName: string;
  appointmentId: string;

  name?: string | null;
  phone?: string | null;
  service?: string | null;
  location?: string | null;

  previousAppointmentLabel: string;
  newAppointmentLabel: string;
};

export function generateAppointmentRescheduledEmail({
  businessName,
  appointmentId,
  name,
  phone,
  service,
  location,
  previousAppointmentLabel,
  newAppointmentLabel,
}: GenerateAppointmentRescheduledEmailParams) {
  const customerName = name || "Not provided";

  const customerPhone = phone || "Not provided";

  const requestedService = service || "Not provided";

  const customerLocation = location || "Not provided";

  const email = {
    body: {
      greeting: `Hi ${businessName},`,

      intro: "An appointment has been rescheduled.",

      table: {
        data: [
          {
            item: "Customer",
            value: customerName,
          },
          {
            item: "Phone",
            value: customerPhone,
          },
          {
            item: "Service",
            value: requestedService,
          },
          {
            item: "Location",
            value: customerLocation,
          },
          {
            item: "Previous appointment",
            value: previousAppointmentLabel,
          },
          {
            item: "New appointment",
            value: newAppointmentLabel,
          },
          {
            item: "Appointment ID",
            value: appointmentId,
          },
        ],

        columns: {
          customWidth: {
            item: "35%",
            value: "65%",
          },

          customAlignment: {
            value: "left",
          },
        },
      },

      outro:
        "The appointment schedule has been updated in your LeadFlowAI dashboard.",
    },
  };

  return {
    subject: `Appointment rescheduled — ${customerName}`,

    html: mailGenerator.generate(email),

    text: mailGenerator.generatePlaintext(email),
  };
}
