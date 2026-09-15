import { checkSmsConversationLock } from "@/lib/sms/sms-conversation-lock";

/* =========================================================
   ASSERT SMS CONVERSATION OWNERSHIP

   Must be called immediately before external side effects
   such as outbound SMS.

   If this worker no longer owns the business + phone lock,
   processing stops instead of allowing a stale worker to
   perform the side effect.
   ========================================================= */

export async function assertSmsConversationOwnership({
  businessId,
  phone,
  ownerToken,
  fenceToken,
}: {
  businessId: any;
  phone: string;
  ownerToken: string;
  fenceToken: number;
}) {
  const ownsLock =
    await checkSmsConversationLock({
      businessId,
      phone,
      ownerToken,
      fenceToken,
    });

  if (!ownsLock) {
    throw new Error(
      "SMS conversation lock ownership was lost before side effect."
    );
  }
}