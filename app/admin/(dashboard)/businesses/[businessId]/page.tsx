import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Globe2,
  Mail,
  MapPin,
  Phone,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Types } from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { Appointment } from "@/models/Appointment";
import { Business } from "@/models/Business";
import { Lead } from "@/models/Lead";

type AdminBusinessPageProps = {
  params: Promise<{
    businessId: string;
  }>;
};

function formatDate(value?: Date | string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
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

export default async function AdminBusinessPage({
  params,
}: AdminBusinessPageProps) {
  const { businessId } = await params;

  if (!Types.ObjectId.isValid(businessId)) {
    notFound();
  }

  await connectDB();

  const business = await Business.findById(businessId)
    .select(
      [
        "name",
        "email",
        "phone",
        "industry",
        "country",
        "countryCode",
        "timezone",
        "currency",
        "slug",
        "emailVerified",
        "createdAt",
        "subscription.plan",
        "subscription.status",
        "subscription.stripeCustomerId",
        "subscription.stripeSubscriptionId",
        "subscription.stripePriceId",
        "subscription.currentPeriodStart",
        "subscription.currentPeriodEnd",
        "subscription.cancelAtPeriodEnd",
        "subscription.cancelAt",
        "subscription.canceledAt",
      ].join(" "),
    )
    .lean();

  if (!business) {
    notFound();
  }

  const [totalLeads, totalAppointments] = await Promise.all([
    Lead.countDocuments({
      businessId: business._id,
    }),

    Appointment.countDocuments({
      businessId: business._id,
    }),
  ]);

  const subscription = business.subscription;

  return (
    <>
      <Link
        href="/admin/businesses"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-white"
      >
        <ArrowLeft size={16} />
        Back to businesses
      </Link>

      <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-blue-400">
            Business
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            {business.name}
          </h1>

          <div className="mt-2 flex items-center gap-2 text-sm text-zinc-500">
            <Mail size={14} />
            {business.email}
          </div>
        </div>

        {business.emailVerified ? (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
            <CheckCircle2 size={14} />
            Email verified
          </span>
        ) : (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400">
            <XCircle size={14} />
            Email unverified
          </span>
        )}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">Total Leads</p>

              <p className="mt-3 text-3xl font-semibold">
                {totalLeads.toLocaleString()}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-zinc-400">
              <Users size={19} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">
                Total Appointments
              </p>

              <p className="mt-3 text-3xl font-semibold">
                {totalAppointments.toLocaleString()}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-zinc-400">
              <CalendarDays size={19} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-center gap-2">
          <CreditCard size={18} className="text-zinc-500" />

          <h2 className="font-semibold">Subscription & Billing</h2>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-zinc-600">
              Plan
            </p>

            <p className="mt-1 text-sm font-medium capitalize text-zinc-200">
              {subscription?.plan ?? "No plan"}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-zinc-600">
              Status
            </p>

            <span
              className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                subscription?.status,
              )}`}
            >
              {formatStatus(subscription?.status)}
            </span>
          </div>

          {subscription?.cancelAtPeriodEnd ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
              <p className="text-xs uppercase tracking-wider text-amber-500/70">
                Cancellation
              </p>

              <p className="mt-1 text-sm text-amber-400">
                Cancels at period end
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          <InfoItem
            label="Period Start"
            value={formatDate(subscription?.currentPeriodStart)}
          />

          <InfoItem
            label="Period End"
            value={formatDate(subscription?.currentPeriodEnd)}
          />

          <InfoItem
            label="Cancel At"
            value={formatDate(subscription?.cancelAt)}
          />

          <InfoItem
            label="Canceled At"
            value={formatDate(subscription?.canceledAt)}
          />

          <InfoItem
            label="Stripe Customer ID"
            value={subscription?.stripeCustomerId}
            mono
          />

          <InfoItem
            label="Stripe Subscription ID"
            value={subscription?.stripeSubscriptionId}
            mono
          />

          <InfoItem
            label="Stripe Price ID"
            value={subscription?.stripePriceId}
            mono
          />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-zinc-500" />

          <h2 className="font-semibold">Business Information</h2>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          <InfoItem
            label="Industry"
            value={business.industry}
          />

          <InfoItem
            label="Phone"
            value={business.phone}
            icon={<Phone size={14} />}
          />

          <InfoItem
            label="Country"
            value={business.country}
            icon={<MapPin size={14} />}
          />

          <InfoItem
            label="Country Code"
            value={business.countryCode}
          />

          <InfoItem
            label="Timezone"
            value={business.timezone}
            icon={<Globe2 size={14} />}
          />

          <InfoItem
            label="Currency"
            value={business.currency}
          />

          <InfoItem
            label="Public Slug"
            value={business.slug}
          />

          <InfoItem
            label="Joined"
            value={formatDate(business.createdAt)}
          />
        </div>
      </div>
    </>
  );
}

function InfoItem({
  label,
  value,
  icon,
  mono = false,
}: {
  label: string;
  value?: string | null;
  icon?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">
        {label}
      </p>

      <div className="mt-2 flex min-w-0 items-center gap-2 text-sm text-zinc-300">
        {icon}

        <span
          className={
            mono
              ? "break-all font-mono text-xs text-zinc-400"
              : "break-words"
          }
        >
          {value || "—"}
        </span>
      </div>
    </div>
  );
}