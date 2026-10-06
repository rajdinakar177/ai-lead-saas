import twilio from "twilio";

type SendSmsParams = {
  to: string;
  from: string;
  body: string;
};

export async function sendSms({ to, from, body }: SendSmsParams) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid) {
    throw new Error("TWILIO_ACCOUNT_SID is not configured.");
  }

  if (!authToken) {
    throw new Error("TWILIO_AUTH_TOKEN is not configured.");
  }

  if (!/^\+1\d{10}$/.test(from)) {
    throw new Error("A valid US business SMS number is required.");
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
