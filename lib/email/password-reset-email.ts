import "server-only";

import { mailGenerator } from "@/lib/email/mailgen";
import { sendEmail } from "@/lib/email/send-email";

type SendPasswordResetEmailParams = {
  businessEmail: string;
  businessName: string;
  resetUrl: string;
};

export async function sendPasswordResetEmail({
  businessEmail,
  businessName,
  resetUrl,
}: SendPasswordResetEmailParams) {
  const brandName = process.env.BREVO_SENDER_NAME?.trim() || "Your account";

  const safeBusinessName = businessName.trim().slice(0, 100);
  const safeBrandName = brandName.slice(0, 100);

  const email = {
    body: {
      greeting: `Hi ${safeBusinessName}`,

      intro: [
        `We received a request to reset the password for your ${safeBrandName} account.`,
        "Use the button below to create a new password.",
      ],

      action: {
        instructions: "Click the button below to securely reset your password.",

        button: {
          color: "#6D5DFB",
          text: "Reset Password",
          link: resetUrl,
        },
      },

      outro: [
        "This password reset link expires in 1 hour and can only be used once.",
        "If you did not request a password reset, you can safely ignore this email.",
      ],
    },
  };

  const html = mailGenerator.generate(email);
  const text = mailGenerator.generatePlaintext(email);

  await sendEmail({
    toEmail: businessEmail,
    toName: safeBusinessName,
    subject: `Reset your ${safeBrandName} password`,
    html,
    text,
  });
}
