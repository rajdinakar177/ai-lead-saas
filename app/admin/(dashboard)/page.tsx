import { Building2, CalendarDays, CircleCheckBig, Users } from "lucide-react";

import { connectDB } from "@/lib/mongodb";
import { Appointment } from "@/models/Appointment";
import { Business } from "@/models/Business";
import { Lead } from "@/models/Lead";

export default async function AdminPage() {
  await connectDB();

  const [totalBusinesses, verifiedBusinesses, totalLeads, totalAppointments] = await Promise.all([
    Business.countDocuments(),
    Business.countDocuments({
      emailVerified: true,
    }),
    Lead.countDocuments(),
    Appointment.countDocuments(),
  ]);

  const stats = [
    {
      label: "Total Businesses",
      value: totalBusinesses,
      icon: Building2,
    },
    {
      label: "Verified Businesses",
      value: verifiedBusinesses,
      icon: CircleCheckBig,
    },
    {
      label: "Total Leads",
      value: totalLeads,
      icon: Users,
    },
    {
      label: "Total Appointments",
      value: totalAppointments,
      icon: CalendarDays,
    },
  ];

  return (
    <>
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-blue-400">Super Admin</p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Platform Overview</h1>

        <p className="mt-2 text-zinc-500">
          Monitor businesses, leads, appointments and platform activity.
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

                  <p className="mt-3 text-3xl font-semibold tracking-tight">
                    {stat.value.toLocaleString()}
                  </p>
                </div>

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-zinc-400">
                  <Icon size={19} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-lg font-semibold">Revenue & subscriptions</h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
          Subscription, MRR and payment metrics will become available after Stripe billing is
          connected.
        </p>
      </div>
    </>
  );
}
