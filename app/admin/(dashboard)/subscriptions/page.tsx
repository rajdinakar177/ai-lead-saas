import { CreditCard } from "lucide-react";
import Link from "next/link";

import { connectDB } from "@/lib/mongodb";
import { Business } from "@/models/Business";

function formatDate(value?: Date | string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function getStatusClasses(status?: string | null) {
  switch (status) {
    case "active":
      return "bg-emerald-500/10 text-emerald-400";

    case "trialing":
      return "bg-blue-500/10 text-blue-400";

    case "past_due":
    case "unpaid":
      return "bg-amber-500/10 text-amber-400";

    case "canceled":
    case "incomplete_expired":
      return "bg-red-500/10 text-red-400";

    default:
      return "bg-white/5 text-zinc-400";
  }
}

function formatStatus(status?: string | null) {
  if (!status || status === "none") {
    return "No subscription";
  }

  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default async function AdminSubscriptionsPage() {
  await connectDB();

  const businesses = await Business.find({
    "subscription.stripeSubscriptionId": {
      $nin: [null, ""],
    },
  })
    .select(
      "name email subscription.plan subscription.status subscription.stripeCustomerId subscription.stripeSubscriptionId subscription.currentPeriodStart subscription.currentPeriodEnd subscription.cancelAtPeriodEnd subscription.cancelAt createdAt",
    )
    .sort({
      createdAt: -1,
    })
    .lean();

  const starterCount = businesses.filter(
    (business) =>
      business.subscription?.plan === "starter" &&
      ["active", "trialing"].includes(business.subscription?.status ?? ""),
  ).length;

  const proCount = businesses.filter(
    (business) =>
      business.subscription?.plan === "pro" &&
      ["active", "trialing"].includes(business.subscription?.status ?? ""),
  ).length;

  const pastDueCount = businesses.filter(
    (business) => business.subscription?.status === "past_due",
  ).length;

  return (
    <>
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-blue-400">Billing</p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Subscriptions</h1>

        <p className="mt-2 text-zinc-500">
          Monitor customer plans, subscription status and billing periods.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Stripe Subscriptions" value={businesses.length} />

        <SummaryCard label="Active Starter" value={starterCount} />

        <SummaryCard label="Active Pro" value={proCount} />

        <SummaryCard label="Past Due" value={pastDueCount} />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-zinc-400">
            <CreditCard size={19} />
          </div>

          <div>
            <h2 className="font-semibold">Customer subscriptions</h2>

            <p className="mt-1 text-xs text-zinc-600">
              Subscription state synchronized from Stripe webhooks.
            </p>
          </div>
        </div>

        {businesses.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-zinc-500">No Stripe subscriptions found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-600">
                <tr>
                  <th className="px-6 py-4 font-medium">Business</th>

                  <th className="px-4 py-4 font-medium">Plan</th>

                  <th className="px-4 py-4 font-medium">Status</th>

                  <th className="px-4 py-4 font-medium">Current period</th>

                  <th className="px-4 py-4 font-medium">Cancellation</th>

                  <th className="px-4 py-4 font-medium">Stripe subscription</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {businesses.map((business) => {
                  const subscription = business.subscription;

                  return (
                    <tr key={business._id.toString()} className="transition hover:bg-white/[0.02]">
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/businesses/${business._id.toString()}`}
                          className="font-medium text-zinc-200 transition hover:text-blue-400"
                        >
                          {business.name}
                        </Link>

                        <p className="mt-1 text-xs text-zinc-600">{business.email}</p>
                      </td>

                      <td className="px-4 py-4">
                        <span className="capitalize text-zinc-300">
                          {subscription?.plan ?? "—"}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                            subscription?.status,
                          )}`}
                        >
                          {formatStatus(subscription?.status)}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-zinc-400">
                        <div>{formatDate(subscription?.currentPeriodStart)}</div>

                        <div className="mt-1 text-xs text-zinc-600">
                          to {formatDate(subscription?.currentPeriodEnd)}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-zinc-400">
                        {subscription?.cancelAtPeriodEnd ? (
                          <>
                            <span className="text-amber-400">Cancels at period end</span>

                            <p className="mt-1 text-xs text-zinc-600">
                              {formatDate(subscription?.cancelAt ?? subscription?.currentPeriodEnd)}
                            </p>
                          </>
                        ) : (
                          <span className="text-zinc-600">No</span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {subscription?.stripeSubscriptionId ? (
                          <span
                            title={subscription.stripeSubscriptionId}
                            className="font-mono text-xs text-zinc-500"
                          >
                            {subscription.stripeSubscriptionId.length > 22
                              ? `${subscription.stripeSubscriptionId.slice(0, 22)}...`
                              : subscription.stripeSubscriptionId}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-sm text-zinc-500">{label}</p>

      <p className="mt-3 text-3xl font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}
