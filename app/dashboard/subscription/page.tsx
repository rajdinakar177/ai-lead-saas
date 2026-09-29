import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { SubscriptionSettings } from "@/components/dashboard/subscription-settings";

import { requireBusiness } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  const business = await requireBusiness();

  return (
    <div>
      <DashboardHeader
        title="Subscription"
        description="Manage your plan, billing, and subscription."
      />

      <div className="mt-8 max-w-4xl">
        <SubscriptionSettings
          currentPlan={business.subscription?.plan ?? null}
          currentStatus={business.subscription?.status ?? "none"}
          cancelAt={
            business.subscription?.cancelAt
              ? business.subscription.cancelAt.toISOString()
              : null
          }
        />
      </div>
    </div>
  );
}