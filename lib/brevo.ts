import "server-only";

import { BrevoClient } from "@getbrevo/brevo";

if (!process.env.BREVO_API_KEY) {
  throw new Error("BREVO_API_KEY is not configured");
}

export const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
});
