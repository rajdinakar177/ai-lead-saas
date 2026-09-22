import { CreditCard, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function AdminSubscriptionsPage() {
  return (
    <>
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-blue-400">
          Billing
        </p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Subscriptions
        </h1>

        <p className="mt-2 text-zinc-500">
          Monitor customer plans and subscription status.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-zinc-400">
          <CreditCard size={22} />
        </div>

        <h2 className="mt-5 text-lg font-semibold">
          Subscription billing is not connected yet
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
          Customer plans, subscription status, billing periods and recurring
          revenue will appear here after Stripe billing is integrated.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-zinc-600">
              Planned
            </p>

            <p className="mt-1 text-sm text-zinc-300">
              Starter / Growth / Pro
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-zinc-600">
              Source of truth
            </p>

            <p className="mt-1 text-sm text-zinc-300">Stripe</p>
          </div>
        </div>

        <Link
          href="/admin/businesses"
          className="mt-7 inline-flex items-center gap-2 text-sm text-blue-400 transition hover:text-blue-300"
        >
          View businesses
          <ExternalLink size={14} />
        </Link>
      </div>
    </>
  );
}