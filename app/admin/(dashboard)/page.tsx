import { Building2, CircleCheckBig, CreditCard, DollarSign, Users } from "lucide-react";
import { PLAN_PRICING } from "@/lib/plan-pricing";
import { connectDB } from "@/lib/mongodb";
import { Business } from "@/models/Business";
import { Lead } from "@/models/Lead";

const STARTER_MONTHLY_PRICE = PLAN_PRICING.starter.monthlyUsd;
const PRO_MONTHLY_PRICE = PLAN_PRICING.pro.monthlyUsd;

export default async function AdminPage() {
  await connectDB();

  const [
    totalBusinesses,
    verifiedBusinesses,
    totalLeads,
    activeStarterSubscriptions,
    activeProSubscriptions,
  ] = await Promise.all([
    Business.countDocuments(),

    Business.countDocuments({
      emailVerified: true,
    }),

    Lead.countDocuments(),

    Business.countDocuments({
      "subscription.plan": "starter",
      "subscription.status": {
        $in: ["active", "trialing"],
      },
    }),

    Business.countDocuments({
      "subscription.plan": "pro",
      "subscription.status": {
        $in: ["active", "trialing"],
      },
    }),
  ]);

  const activeSubscriptions = activeStarterSubscriptions + activeProSubscriptions;

  const estimatedMrr =
    activeStarterSubscriptions * STARTER_MONTHLY_PRICE + activeProSubscriptions * PRO_MONTHLY_PRICE;

  const stats = [
    {
      label: "Total Businesses",
      value: totalBusinesses.toLocaleString(),
      icon: Building2,
    },
    {
      label: "Verified Businesses",
      value: verifiedBusinesses.toLocaleString(),
      icon: CircleCheckBig,
    },
    {
      label: "Active Subscriptions",
      value: activeSubscriptions.toLocaleString(),
      icon: CreditCard,
    },
    {
      label: "Estimated MRR",
      value: `$${estimatedMrr.toLocaleString()}`,
      icon: DollarSign,
    },
  ];

  return (
    <>
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-blue-400">Super Admin</p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Platform Overview</h1>

        <p className="mt-2 text-zinc-500">
          Monitor businesses, subscriptions, revenue and platform activity.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-zinc-500">{stat.label}</p>

                  <p className="mt-3 text-3xl font-semibold tracking-tight">{stat.value}</p>
                </div>

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-zinc-400">
                  <Icon size={19} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-500">Starter</p>

          <p className="mt-3 text-3xl font-semibold">
            {activeStarterSubscriptions.toLocaleString()}
          </p>

          <p className="mt-2 text-xs text-zinc-600">Active or trialing subscriptions</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-500">Pro</p>

          <p className="mt-3 text-3xl font-semibold">{activeProSubscriptions.toLocaleString()}</p>

          <p className="mt-2 text-xs text-zinc-600">Active or trialing subscriptions</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center gap-2 text-zinc-500">
            <Users size={16} />

            <p className="text-sm">Total Leads</p>
          </div>

          <p className="mt-3 text-3xl font-semibold">{totalLeads.toLocaleString()}</p>

          <p className="mt-2 text-xs text-zinc-600">Leads captured across all businesses</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-lg font-semibold">Revenue & subscriptions</h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
          Estimated MRR is calculated from active and trialing Starter and Pro subscriptions using
          the current monthly plan prices. Stripe payment data is available separately in the
          Payments section.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <RevenueItem
            label="Starter MRR"
            value={`$${(activeStarterSubscriptions * STARTER_MONTHLY_PRICE).toLocaleString()}`}
          />

          <RevenueItem
            label="Pro MRR"
            value={`$${(activeProSubscriptions * PRO_MONTHLY_PRICE).toLocaleString()}`}
          />

          <RevenueItem label="Estimated Total MRR" value={`$${estimatedMrr.toLocaleString()}`} />
        </div>
      </div>
    </>
  );
}

function RevenueItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-4">
      <p className="text-xs uppercase tracking-wider text-zinc-600">{label}</p>

      <p className="mt-2 text-xl font-semibold text-zinc-200">{value}</p>
    </div>
  );
}
