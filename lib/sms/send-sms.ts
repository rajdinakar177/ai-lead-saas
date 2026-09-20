import twilio from "twilio";

type SendSmsParams = {
  to: string;
  body: string;
};

export async function sendSms({ to, body }: SendSmsParams) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;

  const authToken = process.env.TWILIO_AUTH_TOKEN;

  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid) {
    throw new Error("TWILIO_ACCOUNT_SID is not configured.");
  }

  if (!authToken) {
    throw new Error("TWILIO_AUTH_TOKEN is not configured.");
  }

  if (!from) {
    throw new Error("TWILIO_PHONE_NUMBER is not configured.");
  }

  const client = twilio(accountSid, authToken);

  const message = await client.messages.create({
    to,
    from,
    body,
  });

  return {
    success: true,
    sid: message.sid,
    status: message.status,
  };
}
