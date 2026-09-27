import { safeLogger } from "@/lib/security/safe-logger";
import { sendSms } from "@/lib/sms/send-sms";

type SendSmsReplyParams = {
  to: string;
  body: string;
};

type SmsMode = "mock" | "twilio";

export async function sendSmsReply({ to, body }: SendSmsReplyParams) {
  const mode = (process.env.SMS_MODE ?? "mock") as SmsMode;

  // ----------------------------
  // MOCK MODE
  // ----------------------------

  if (mode === "mock") {
    if (process.env.NODE_ENV === "development") {
      safeLogger.info("Mock SMS outbound.");
    }

    return {
      success: true,
      mode: "mock" as const,
      sid: null,
      status: "mocked",
    };
  }

  // ----------------------------
  // TWILIO MODE
  // ----------------------------

  if (mode === "twilio") {
    const result = await sendSms({
      to,
      body,
    });

    return {
      ...result,
      mode: "twilio" as const,
    };
  }

  throw new Error(`Invalid SMS_MODE: ${mode}`);
}
