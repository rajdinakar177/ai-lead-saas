import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
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

export default async function AdminBusinessPage({ params }: AdminBusinessPageProps) {
  const { businessId } = await params;

  if (!Types.ObjectId.isValid(businessId)) {
    notFound();
  }

  await connectDB();

  const business = await Business.findById(businessId)
    .select(
      "name email phone industry country countryCode timezone currency slug emailVerified createdAt",
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
          <p className="text-sm font-medium uppercase tracking-widest text-blue-400">Business</p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{business.name}</h1>

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

              <p className="mt-3 text-3xl font-semibold">{totalLeads.toLocaleString()}</p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-zinc-400">
              <Users size={19} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">Total Appointments</p>

              <p className="mt-3 text-3xl font-semibold">{totalAppointments.toLocaleString()}</p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-zinc-400">
              <CalendarDays size={19} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-zinc-500" />

          <h2 className="font-semibold">Business Information</h2>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          <InfoItem label="Industry" value={business.industry} />

          <InfoItem label="Phone" value={business.phone} icon={<Phone size={14} />} />

          <InfoItem label="Country" value={business.country} icon={<MapPin size={14} />} />

          <InfoItem label="Country Code" value={business.countryCode} />

          <InfoItem label="Timezone" value={business.timezone} icon={<Globe2 size={14} />} />

          <InfoItem label="Currency" value={business.currency} />

          <InfoItem label="Public Slug" value={business.slug} />

          <InfoItem
            label="Joined"
            value={
              business.createdAt
                ? new Date(business.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "UTC",
                  })
                : null
            }
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
}: {
  label: string;
  value?: string | null;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">{label}</p>

      <div className="mt-2 flex items-center gap-2 text-sm text-zinc-300">
        {icon}

        <span>{value || "—"}</span>
      </div>
    </div>
  );
}
