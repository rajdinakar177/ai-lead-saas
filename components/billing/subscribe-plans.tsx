"use client";

import { useState } from "react";

type PlanId = "starter" | "pro";

export function SubscribePlans() {
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState("");

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
        error instanceof Error
          ? error.message
          : "Unable to start checkout.",
      );

      setLoadingPlan(null);
    }
  }

  const plans = [
    {
      id: "starter" as const,
      name: "Starter",
      price: "$49",
      description:
        "Everything you need to start capturing and qualifying leads.",
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
      description:
        "More automation and capacity for growing service businesses.",
      features: [
        "Everything in Starter",
        "Advanced SMS automation",
        "Automated follow-ups",
        "Google Calendar integration",
      ],
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {plans.map((plan) => {
        const isLoading = loadingPlan === plan.id;

        return (
          <div
            key={plan.id}
            className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950 p-7"
          >
            <div>
              <h2 className="text-xl font-semibold text-white">
                {plan.name}
              </h2>

              <div className="mt-4">
                <span className="text-4xl font-bold text-white">
                  {plan.price}
                </span>

                <span className="ml-1 text-sm text-zinc-500">
                  /month
                </span>
              </div>

              <p className="mt-4 text-sm leading-6 text-zinc-400">
                {plan.description}
              </p>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="text-sm text-zinc-300"
                  >
                    ✓ {feature}
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              disabled={loadingPlan !== null}
              onClick={() => startCheckout(plan.id)}
              className="mt-8 w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading
                ? "Opening checkout..."
                : `Choose ${plan.name}`}
            </button>
          </div>
        );
      })}

      {error && (
        <div className="md:col-span-2 rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}