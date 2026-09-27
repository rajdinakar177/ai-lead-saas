"use client";

import { useState } from "react";

type PlanId = "starter" | "pro";

type SubscriptionSettingsProps = {
  currentPlan?: PlanId | null;
  currentStatus?: string | null;
  cancelAt?: string | null;
};

export function SubscriptionSettings({
  currentPlan = null,
  currentStatus = "none",
  cancelAt = null,
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
      <div className="mb-5">
        <h2 className="font-semibold text-white">Subscription</h2>

        <p className="mt-1 text-sm text-zinc-600">
          Manage your subscription and billing.
        </p>
      </div>

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
