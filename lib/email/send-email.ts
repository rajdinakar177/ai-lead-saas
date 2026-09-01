type SendEmailParams = {
  toEmail: string;
  toName?: string;

  subject: string;

  html: string;

  text?: string;
};

export async function sendEmail({
  toEmail,
  toName,
  subject,
  html,
  text,
}: SendEmailParams) {
  const apiKey =
    process.env.BREVO_API_KEY;

  const senderEmail =
    process.env.BREVO_SENDER_EMAIL;

  const senderName =
    process.env.BREVO_SENDER_NAME ||
    "LeadFlowAI";

  if (!apiKey) {
    throw new Error(
      "BREVO_API_KEY is not configured."
    );
  }

  if (!senderEmail) {
    throw new Error(
      "BREVO_SENDER_EMAIL is not configured."
    );
  }

  const response =
    await fetch(
      "https://api.brevo.com/v3/smtp/email",
      {
        method: "POST",

        headers: {
          accept:
            "application/json",

          "content-type":
            "application/json",

          "api-key":
            apiKey,
        },

        body:
          JSON.stringify({
            sender: {
              name:
                senderName,

              email:
                senderEmail,
            },

            to: [
              {
                email:
                  toEmail,

                name:
                  toName ||
                  toEmail,
              },
            ],

            subject,

            htmlContent:
              html,

            textContent:
              text,
          }),
      }
    );

  if (!response.ok) {
    const errorBody =
      await response.text();

    console.error(
      "Brevo email error:",
      errorBody
    );

    throw new Error(
      "Unable to send email."
    );
  }

  const data =
    await response.json();

  return {
    success: true,

    messageId:
      data.messageId ??
      null,
  };
}