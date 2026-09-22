import { CreditCard, ReceiptText } from "lucide-react";

export default function AdminPaymentsPage() {
  return (
    <>
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-blue-400">
          Billing
        </p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Payments
        </h1>

        <p className="mt-2 text-zinc-500">
          Monitor customer payments and billing activity.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-zinc-400">
          <ReceiptText size={22} />
        </div>

        <h2 className="mt-5 text-lg font-semibold">
          Payment processing is not connected yet
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
          Successful payments, failed payments, refunds and transaction history
          will appear here after Stripe billing is integrated.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PaymentStatus label="Successful" />
          <PaymentStatus label="Failed" />
          <PaymentStatus label="Refunded" />
          <PaymentStatus label="Pending" />
        </div>

        <div className="mt-6 flex items-center gap-2 text-sm text-zinc-600">
          <CreditCard size={15} />
          Stripe will be the source of truth for payment data.
        </div>
      </div>
    </>
  );
}

function PaymentStatus({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-zinc-600">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold text-zinc-400">—</p>
    </div>
  );
}