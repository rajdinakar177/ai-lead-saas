export type SmsQuotaErrorReason =
  "subscription_required" | "billing_period_missing" | "limit_reached";

export class SmsQuotaError extends Error {
  readonly code = "SMS_LIMIT_REACHED";

  readonly reason: SmsQuotaErrorReason;

  readonly used?: number;
  readonly limit?: number;
  readonly remaining?: number;

  constructor({
    reason,
    used,
    limit,
    remaining,
  }: {
    reason: SmsQuotaErrorReason;
    used?: number;
    limit?: number;
    remaining?: number;
  }) {
    const message =
      reason === "limit_reached"
        ? "Monthly SMS segment limit reached."
        : reason === "subscription_required"
          ? "An active subscription is required to send SMS."
          : "Subscription billing period is unavailable.";

    super(message);

    this.name = "SmsQuotaError";

    this.reason = reason;
    this.used = used;
    this.limit = limit;
    this.remaining = remaining;
  }
}
