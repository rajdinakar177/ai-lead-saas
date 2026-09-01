import { mailGenerator } from "@/lib/email/mailgen";

type AppointmentBookedEmailParams = {
  businessName: string;

  appointmentId: string;

  name?: string | null;
  phone?: string | null;
  service?: string | null;
  location?: string | null;

  appointmentLabel: string;
};

export function generateAppointmentBookedEmail({
  businessName,
  appointmentId,
  name,
  phone,
  service,
  location,
  appointmentLabel,
}: AppointmentBookedEmailParams) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  const appointmentUrl =
    `${appUrl}/dashboard/appointments`;

  const email = {
    body: {
      greeting: `Hi ${businessName},`,

      intro: [
        "📅 A customer just booked an appointment.",
        "Here are the appointment details:",
      ],

      table: {
        data: [
          {
            item: "Customer",
            details:
              name || "Not provided",
          },
          {
            item: "Phone",
            details:
              phone || "Not provided",
          },
          {
            item: "Service",
            details:
              service || "Not provided",
          },
          {
            item: "Location",
            details:
              location || "Not provided",
          },
          {
            item: "Appointment",
            details:
              appointmentLabel,
          },
          {
            item: "Status",
            details: "Scheduled",
          },
        ],

        columns: {
          customWidth: {
            item: "30%",
            details: "70%",
          },

          customAlignment: {
            item: "left",
            details: "left",
          },
        },
      },

      action: {
        instructions:
          "Open your dashboard to review and manage this appointment.",

        button: {
          color: "#6D5DFB",
          text: "View Appointment",
          link: appointmentUrl,
        },
      },

      outro: [
        "LeadFlowAI automatically qualified the lead and helped them book this appointment.",
      ],

    },
  };

  return {
    subject:
      `📅 Appointment Booked${
        service
          ? `: ${service}`
          : ""
      }${
        name
          ? ` with ${name}`
          : ""
      }`,

    html:
      mailGenerator.generate(email),

    text:
      mailGenerator.generatePlaintext(
        email
      ),
  };
}