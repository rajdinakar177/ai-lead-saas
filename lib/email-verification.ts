import "server-only";

import crypto from "crypto";

import { brevo } from "@/lib/brevo";

const TOKEN_DURATION = 60 * 60 * 1000;

export function generateVerificationToken() {
  const token = crypto.randomBytes(32).toString("hex");

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const expiresAt = new Date(Date.now() + TOKEN_DURATION);

  return {
    token,
    tokenHash,
    expiresAt,
  };
}

export function hashVerificationToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function sendVerificationEmail({
  email,
  businessName,
  token,
}: {
  email: string;
  businessName: string;
  token: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  const senderEmail = process.env.BREVO_SENDER_EMAIL;

  const senderName = process.env.BREVO_SENDER_NAME || "LeadFlow AI";

  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL is not configured");
  }

  if (!senderEmail) {
    throw new Error("BREVO_SENDER_EMAIL is not configured");
  }

  const verificationUrl = `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;

  await brevo.transactionalEmails.sendTransacEmail({
    subject: "Verify your LeadFlow AI email",

    sender: {
      name: senderName,
      email: senderEmail,
    },

    to: [
      {
        email,
        name: businessName,
      },
    ],

    htmlContent: `
      <!doctype html>
      <html>
        <body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 32px;">
          <div style="max-width: 560px; margin: auto; background: white; padding: 32px; border-radius: 16px;">
            <h2 style="margin-top: 0;">
              Verify your email
            </h2>

            <p>
              Hi ${businessName},
            </p>

            <p>
              Thanks for creating your LeadFlow AI account.
              Please verify your email address to activate your workspace.
            </p>

            <p style="margin: 28px 0;">
              <a
                href="${verificationUrl}"
                style="
                  display: inline-block;
                  background: #111111;
                  color: #ffffff;
                  text-decoration: none;
                  padding: 12px 20px;
                  border-radius: 10px;
                  font-weight: 600;
                "
              >
                Verify Email
              </a>
            </p>

            <p style="font-size: 13px; color: #666;">
              This verification link expires in 1 hour.
            </p>

            <p style="font-size: 13px; color: #666;">
              If you didn't create this account, you can ignore this email.
            </p>
          </div>
        </body>
      </html>
    `,
  });
}
