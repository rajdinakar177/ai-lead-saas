import { redirect } from "next/navigation";

import { SubscribePlans } from "@/components/billing/subscribe-plans";
import { requireBusiness } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SubscribePage() {
  const business = await requireBusiness();

  const subscriptionStatus = business.subscription?.status ?? "none";

  /*
   * Already subscribed businesses should not
   * need to see the initial subscription page.
   */
  if (subscriptionStatus === "active" || subscriptionStatus === "trialing") {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-16 text-white sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-sm font-medium text-zinc-400">
            Subscription required
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Choose your plan
          </h1>

          <p className="mt-4 text-sm leading-6 text-zinc-500 sm:text-base">
            Select a plan to activate your account and access your dashboard.
          </p>
        </div>

        <SubscribePlans />

        <p className="mt-8 text-center text-xs text-zinc-600">
          Secure subscription billing is handled by Stripe.
        </p>
      </div>
    </main>
  );
}
