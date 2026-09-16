
import { mailGenerator } from "@/lib/email/mailgen";

type GenerateAppointmentCancelledEmailParams = {
  businessName: string;
  appointmentId: string;

  name?: string | null;
  phone?: string | null;
  service?: string | null;
  location?: string | null;

  appointmentLabel: string;
};

export function generateAppointmentCancelledEmail({
  businessName,
  appointmentId,
  name,
  phone,
  service,
  location,
  appointmentLabel,
}: GenerateAppointmentCancelledEmailParams) {
 

  const customerName =
    name || "Not provided";

  const customerPhone =
    phone || "Not provided";

  const requestedService =
    service || "Not provided";

  const customerLocation =
    location || "Not provided";

  const email = {
    body: {
      greeting:
        `Hi ${businessName},`,

      intro:
        "An appointment has been cancelled.",

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
            item: "Appointment",
            value: appointmentLabel,
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
        "The appointment has been marked as cancelled in your LeadFlowAI dashboard.",
    },
  };

  return {
    subject:
      `Appointment cancelled — ${customerName}`,

    html:
      mailGenerator.generate(
        email
      ),

    text:
      mailGenerator.generatePlaintext(
        email
      ),
  };
}