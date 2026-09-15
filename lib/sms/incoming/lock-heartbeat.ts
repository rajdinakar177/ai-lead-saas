import { renewSmsConversationLock } from "@/lib/sms/sms-conversation-lock";

type SmsLockHeartbeatParams = {
  businessId: any;
  phone: string;
  ownerToken: string;
  fenceToken: number;
  leaseMs: number;
  renewEveryMs: number;

  onLockLost: (
    error: unknown
  ) => void;
};

export function createSmsLockHeartbeat({
  businessId,
  phone,
  ownerToken,
  fenceToken,
  leaseMs,
  renewEveryMs,
  onLockLost,
}: SmsLockHeartbeatParams) {
  let stopped = false;

  let timer:
    ReturnType<typeof setTimeout> | null =
    null;

  let renewalInFlight:
    Promise<void> | null =
    null;

  let lockLost = false;

  function schedule() {
    if (
      stopped ||
      lockLost
    ) {
      return;
    }

    timer = setTimeout(() => {
      renewalInFlight =
        (async () => {
          try {
            const renewed =
              await renewSmsConversationLock({
                businessId,
                phone,
                ownerToken,
                fenceToken,
                leaseMs,
              });

            if (!renewed) {
              lockLost = true;

              const error =
                new Error(
                  "SMS conversation lock ownership was lost."
                );

              console.error(
                "SMS conversation lock renewal rejected:",
                {
                  businessId:
                    businessId?.toString?.() ??
                    businessId,

                  phone,

                  fenceToken,
                }
              );

              onLockLost(error);

              return;
            }

            console.log(
              "SMS conversation lock renewed:",
              {
                businessId:
                  businessId?.toString?.() ??
                  businessId,

                phone,

                fenceToken,

                expiresAt:
                  renewed.expiresAt,
              }
            );
          } catch (error) {
            /*
             * If MongoDB cannot confirm renewal,
             * the worker must stop assuming it
             * owns this conversation.
             */
            lockLost = true;

            console.error(
              "SMS conversation lock renewal failed:",
              error
            );

            onLockLost(error);
          } finally {
            renewalInFlight =
              null;

            if (
              !stopped &&
              !lockLost
            ) {
              schedule();
            }
          }
        })();
    }, renewEveryMs);
  }

  function start() {
    if (
      stopped ||
      lockLost ||
      timer ||
      renewalInFlight
    ) {
      return;
    }

    schedule();
  }

  async function stop() {
    stopped = true;

    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    /*
     * Wait for an already-running renewal so
     * renew and release cannot race.
     */
    if (renewalInFlight) {
      try {
        await renewalInFlight;
      } catch {
        // Renewal already reports its own error.
      }
    }
  }

  function hasLostLock() {
    return lockLost;
  }

  return {
    start,
    stop,
    hasLostLock,
  };
}

export type SmsLockHeartbeat =
  ReturnType<
    typeof createSmsLockHeartbeat
  >;