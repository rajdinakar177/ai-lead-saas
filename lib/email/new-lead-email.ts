import { mailGenerator } from "@/lib/email/mailgen";
type NewLeadEmailParams = {
    businessName: string;

    leadId: string;

    name?: string | null;

    phone?: string | null;

    service?: string | null;

    location?: string | null;

    urgency?: string | null;

    timeline?: string | null;
};



export function generateNewLeadEmail({
    businessName,
    leadId,
    name,
    phone,
    service,
    location,
    urgency,
    timeline,
}: NewLeadEmailParams) {
    const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        "http://localhost:3000";

    const leadUrl =
        `${appUrl}/dashboard/leads/${leadId}`;

    const email = {
        body: {
            greeting:
                `Hi ${businessName},`,

            intro: [
                "🎯 You just received a new qualified lead.",

                "Here are the details collected by your AI assistant:",
            ],

            table: {
                data: [
                    {
                        item: "Name",
                        details:
                            name ||
                            "Not provided",
                    },

                    {
                        item: "Phone",
                        details:
                            phone ||
                            "Not provided",
                    },

                    {
                        item: "Service",
                        details:
                            service ||
                            "Not provided",
                    },

                    {
                        item: "Location",
                        details:
                            location ||
                            "Not provided",
                    },

                    {
                        item: "Urgency",
                        details:
                            urgency ||
                            "Not provided",
                    },

                    {
                        item: "Preferred timeline",
                        details:
                            timeline ||
                            "Not provided",
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
                    "Open the lead in your dashboard to review the conversation and follow up.",

                button: {
                    color: "#6D5DFB",

                    text:
                        "View Lead",

                    link:
                        leadUrl,
                },
            },

            outro: [
                "LeadFlowAI captured and qualified this lead automatically.",

                "Respond quickly while the customer is still interested.",
            ],

        },
    };

    const html =
        mailGenerator.generate(
            email
        );

    const text =
        mailGenerator.generatePlaintext(
            email
        );

    return {
        subject:
            `🔥 New Lead: ${service ||
            "Service Request"
            }${name
                ? ` from ${name}`
                : ""
            }`,

        html,

        text,
    };
}