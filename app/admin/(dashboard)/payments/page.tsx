import { CreditCard, ReceiptText } from "lucide-react";

import { getStripe } from "@/lib/stripe";

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function getStatusClasses(status?: string | null) {
  switch (status) {
    case "paid":
      return "bg-emerald-500/10 text-emerald-400";

    case "open":
      return "bg-blue-500/10 text-blue-400";

    case "uncollectible":
      return "bg-red-500/10 text-red-400";

    case "void":
      return "bg-zinc-500/10 text-zinc-400";

    case "draft":
      return "bg-amber-500/10 text-amber-400";

    default:
      return "bg-white/5 text-zinc-400";
  }
}

function formatStatus(status?: string | null) {
  if (!status) {
    return "Unknown";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function AdminPaymentsPage() {
  const stripe = getStripe();

  const invoices = await stripe.invoices.list({
    limit: 50,
    expand: ["data.customer"],
  });

  const successfulPayments = invoices.data.filter((invoice) => invoice.status === "paid").length;

  const failedPayments = invoices.data.filter(
    (invoice) => invoice.status === "uncollectible",
  ).length;

  const pendingPayments = invoices.data.filter(
    (invoice) => invoice.status === "open" || invoice.status === "draft",
  ).length;

  const totalCollected = invoices.data
    .filter((invoice) => invoice.status === "paid")
    .reduce((total, invoice) => total + invoice.amount_paid, 0);

  return (
    <>
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-blue-400">Billing</p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Payments</h1>

        <p className="mt-2 text-zinc-500">Monitor recent Stripe invoices and payment activity.</p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PaymentStatus label="Paid" value={successfulPayments.toLocaleString()} />

        <PaymentStatus label="Failed" value={failedPayments.toLocaleString()} />

        <PaymentStatus label="Pending" value={pendingPayments.toLocaleString()} />

        <PaymentStatus
          label="Collected"
          value={
            invoices.data.length > 0
              ? formatCurrency(totalCollected, invoices.data[0]?.currency ?? "usd")
              : "$0.00"
          }
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-zinc-400">
            <ReceiptText size={19} />
          </div>

          <div>
            <h2 className="font-semibold">Recent invoices</h2>

            <p className="mt-1 text-xs text-zinc-600">
              Latest billing activity retrieved directly from Stripe.
            </p>
          </div>
        </div>

        {invoices.data.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CreditCard size={28} className="mx-auto text-zinc-700" />

            <p className="mt-4 text-sm text-zinc-500">No Stripe invoices found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-600">
                <tr>
                  <th className="px-6 py-4 font-medium">Customer</th>

                  <th className="px-4 py-4 font-medium">Amount</th>

                  <th className="px-4 py-4 font-medium">Status</th>

                  <th className="px-4 py-4 font-medium">Invoice</th>

                  <th className="px-4 py-4 font-medium">Date</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {invoices.data.map((invoice) => {
                  const customer =
                    typeof invoice.customer === "object" &&
                    invoice.customer !== null &&
                    !invoice.customer.deleted
                      ? invoice.customer
                      : null;

                  return (
                    <tr key={invoice.id} className="transition hover:bg-white/[0.02]">
                      <td className="px-6 py-4">
                        <p className="font-medium text-zinc-200">
                          {customer?.name || customer?.email || "Stripe customer"}
                        </p>

                        {customer?.name && customer?.email ? (
                          <p className="mt-1 text-xs text-zinc-600">{customer.email}</p>
                        ) : null}

                        <p className="mt-1 font-mono text-xs text-zinc-700">
                          {typeof invoice.customer === "string"
                            ? invoice.customer
                            : (customer?.id ?? "—")}
                        </p>
                      </td>

                      <td className="px-4 py-4 font-medium text-zinc-300">
                        {formatCurrency(invoice.amount_due, invoice.currency)}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                            invoice.status,
                          )}`}
                        >
                          {formatStatus(invoice.status)}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-mono text-xs text-zinc-500">
                          {invoice.number ?? invoice.id}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-zinc-400">{formatDate(invoice.created)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-zinc-600">
        Showing the latest {invoices.data.length} Stripe invoices.
      </p>
    </>
  );
}

function PaymentStatus({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-sm text-zinc-500">{label}</p>

      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </div>
  );
}
