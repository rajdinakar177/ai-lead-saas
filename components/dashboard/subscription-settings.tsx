"use client";

import { useState } from "react";

type PlanId = "starter" | "pro";
type SubscriptionUsage = {
  leads: {
    used: number;
    limit: number;
  };
  aiConversations: {
    used: number;
    limit: number;
  };
  smsSegments: {
    used: number;
    limit: number;
  };
  appointments: {
    used: number;
    limit: number;
  };
};
type SubscriptionSettingsProps = {
  currentPlan?: PlanId | null;
  currentStatus?: string | null;
  cancelAt?: string | null;
  usage?: SubscriptionUsage | null;
};

export function SubscriptionSettings({
  currentPlan = null,
  currentStatus = "none",
  cancelAt = null,
  usage = null,
}: SubscriptionSettingsProps) {
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [error, setError] = useState("");

  const hasManageableSubscription =
    currentStatus === "active" ||
    currentStatus === "trialing" ||
    currentStatus === "past_due";

  const cancellationDate = cancelAt
    ? new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(cancelAt))
    : null;

  async function startCheckout(plan: PlanId) {
    try {
      setError("");
      setLoadingPlan(plan);

      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to start checkout.");
      }

      if (!data.url) {
        throw new Error("Checkout URL was not returned.");
      }

      window.location.href = data.url;
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to start checkout.",
      );

      setLoadingPlan(null);
    }
  }

  async function openBillingPortal() {
    try {
      setError("");
      setBillingLoading(true);

      const response = await fetch("/api/billing/portal", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to open billing portal.");
      }

      if (!data.url) {
        throw new Error("Billing portal URL was not returned.");
      }

      window.location.href = data.url;
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to open billing portal.",
      );

      setBillingLoading(false);
    }
  }

  const plans = [
    {
      id: "starter" as const,
      name: "Starter",
      price: "$49",
      description: "For businesses getting started with AI lead management.",
      features: [
        "AI lead qualification",
        "Lead management dashboard",
        "Appointment booking",
        "Basic SMS automation",
      ],
    },
    {
      id: "pro" as const,
      name: "Pro",
      price: "$99",
      description: "For businesses that need more automation and capacity.",
      features: [
        "Everything in Starter",
        "Advanced SMS automation",
        "Automated follow-ups",
        "Google Calendar integration",
      ],
    },
  ];

  return (
    <div>


      {currentPlan && currentStatus !== "none" && (
        <div className="mb-5 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-zinc-400">Current plan</p>

              <p className="mt-1 font-medium text-white">
                {currentPlan === "starter" ? "Starter" : "Pro"}
                {" · "}
                <span className="capitalize">
                  {(currentStatus ?? "none").replaceAll("_", " ")}
                </span>
              </p>

              {cancellationDate && currentStatus === "active" && (
                <p className="mt-2 text-sm text-amber-400">
                  Scheduled to cancel on {cancellationDate}
                </p>
              )}
            </div>

            {hasManageableSubscription && (
              <button
                type="button"
                onClick={openBillingPortal}
                disabled={billingLoading}
                className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {billingLoading ? "Opening billing..." : "Manage Billing"}
              </button>
            )}
          </div>
        </div>
      )}
      {usage && (
        <div className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="mb-4">
            <h3 className="font-medium text-white">Current usage</h3>

            <p className="mt-1 text-sm text-zinc-500">
              Usage for your current billing period.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                label: "Leads",
                ...usage.leads,
              },
              {
                label: "AI Conversations",
                ...usage.aiConversations,
              },
              {
                label: "SMS Segments",
                ...usage.smsSegments,
              },
              {
                label: "Appointments",
                ...usage.appointments,
              },
            ].map((item) => {
              const percentage =
                item.limit > 0
                  ? Math.min(100, (item.used / item.limit) * 100)
                  : 0;

              return (
                <div
                  key={item.label}
                  className="rounded-xl border border-zinc-800 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-zinc-400">
                      {item.label}
                    </span>

                    <span className="text-sm font-medium text-white">
                      {item.used.toLocaleString()} /{" "}
                      {item.limit.toLocaleString()}
                    </span>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-white transition-all"
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>

                  <p className="mt-2 text-xs text-zinc-600">
                    {Math.max(0, item.limit - item.used).toLocaleString()} remaining
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {error && (
        <div className="mb-5 rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {plans.map((plan) => {
          const isCurrentPlan =
            currentPlan === plan.id &&
            (currentStatus === "active" || currentStatus === "trialing");

          return (
            <div
              key={plan.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
            >
              <h3 className="text-lg font-semibold text-white">{plan.name}</h3>

              <div className="mt-3">
                <span className="text-3xl font-bold text-white">
                  {plan.price}
                </span>

                <span className="text-sm text-zinc-500">/month</span>
              </div>

              <p className="mt-3 text-sm leading-6 text-zinc-500">
                {plan.description}
              </p>

              <ul className="mt-5 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="text-sm text-zinc-300">
                    ✓ {feature}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={
                  hasManageableSubscription ||
                  loadingPlan !== null ||
                  billingLoading
                }
                onClick={() => startCheckout(plan.id)}
                className="mt-6 w-full rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCurrentPlan
                  ? "Current Plan"
                  : hasManageableSubscription
                    ? "Manage subscription above"
                    : loadingPlan === plan.id
                      ? "Opening checkout..."
                      : `Choose ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
