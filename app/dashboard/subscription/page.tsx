import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { SubscriptionSettings } from "@/components/dashboard/subscription-settings";

import { requireBusiness } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { getSubscriptionAccess } from "@/lib/subscription-access";

import { BusinessUsage } from "@/models/BusinessUsage";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  const business = await requireBusiness();

  await connectDB();

  const access = getSubscriptionAccess(business.subscription);

  const periodStart = business.subscription?.currentPeriodStart ?? null;
  const periodEnd = business.subscription?.currentPeriodEnd ?? null;

  const usage =
    access.hasAccess && periodStart && periodEnd
      ? await BusinessUsage.findOne({
          businessId: business._id,
          periodStart,
          periodEnd,
        })
          .select("leads aiConversations smsSegments appointments")
          .lean()
      : null;

  return (
    <div>
      <DashboardHeader
        title="Subscription"
        description="Manage your plan, billing, usage, and subscription."
      />

      <div className="mt-8 max-w-8xl">
        <SubscriptionSettings
          currentPlan={business.subscription?.plan ?? null}
          currentStatus={business.subscription?.status ?? "none"}
          cancelAt={
            business.subscription?.cancelAt ? business.subscription.cancelAt.toISOString() : null
          }
          usage={
            access.limits
              ? {
                  leads: {
                    used: usage?.leads ?? 0,
                    limit: access.limits.leads,
                  },
                  aiConversations: {
                    used: usage?.aiConversations ?? 0,
                    limit: access.limits.aiConversations,
                  },
                  smsSegments: {
                    used: usage?.smsSegments ?? 0,
                    limit: access.limits.smsSegments,
                  },
                  appointments: {
                    used: usage?.appointments ?? 0,
                    limit: access.limits.appointments,
                  },
                }
              : null
          }
        />
      </div>
    </div>
  );
}
