import twilio from "twilio";

type VerifyTwilioSignatureParams = {
  signature: string | null;
  url: string;
  params: Record<string, string>;
};

export function verifyTwilioSignature({
  signature,
  url,
  params,
}: VerifyTwilioSignatureParams) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!authToken) {
    throw new Error("TWILIO_AUTH_TOKEN is not configured.");
  }

  if (!signature) {
    return false;
  }

  return twilio.validateRequest(authToken, signature, url, params);
}
