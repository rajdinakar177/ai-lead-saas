import { CalendarDays, CircleCheckBig, Flame, Users } from "lucide-react";
import Link from "next/link";

import { connectDB } from "@/lib/mongodb";
import { requireBusiness } from "@/lib/auth";
import { Lead } from "@/models/Lead";
import { Appointment } from "@/models/Appointment";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/dashboard/status-badge";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await connectDB();

  const business = await requireBusiness();

  if (!business) {
    return <div>Business not found.</div>;
  }
  const [totalLeads, hotLeads, bookedLeads, appointmentCount, recentLeads] = await Promise.all([
    Lead.countDocuments({
      businessId: business._id,
    }),

    Lead.countDocuments({
      businessId: business._id,
      status: "hot",
    }),

    Lead.countDocuments({
      businessId: business._id,
      status: "booked",
    }),

    Appointment.countDocuments({
      businessId: business._id,
    }),

    Lead.find({
      businessId: business._id,
    })
      .sort({
        createdAt: -1,
      })
      .limit(6)
      .lean(),
  ]);

  return (
    <div>
      <DashboardHeader title="Overview" description="Here's what's happening with your leads." />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Leads"
          value={totalLeads}
          description="All leads captured"
          icon="users"
        />

        <StatCard
          label="Hot Leads"
          value={hotLeads}
          description="High-intent opportunities"
          icon="flame"
        />
        <StatCard
          label="Appointments"
          value={appointmentCount}
          description="Appointments scheduled"
          icon="calendar"
        />

        <StatCard
          label="Booked Leads"
          value={bookedLeads}
          description="Successfully converted"
          icon="check"
        />
      </div>

      <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03]">
        <div className="flex items-center justify-between border-b border-white/10 p-6">
          <div>
            <h2 className="font-semibold text-white">Recent Leads</h2>

            <p className="mt-1 text-sm text-zinc-600">
              Latest leads captured by your AI assistant.
            </p>
          </div>

          <Link
            href="/dashboard/leads"
            className="text-sm font-medium text-blue-400 hover:text-violet-300"
          >
            View all →
          </Link>
        </div>

        {recentLeads.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-600">
            No leads yet. Complete the AI demo to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-zinc-600">
                  <th className="px-6 py-4 font-medium">Lead</th>

                  <th className="px-6 py-4 font-medium">Service</th>

                  <th className="px-6 py-4 font-medium">Urgency</th>

                  <th className="px-6 py-4 font-medium">Status</th>

                  <th className="px-6 py-4 font-medium">Created</th>
                </tr>
              </thead>

              <tbody>
                {recentLeads.map((lead) => (
                  <tr key={lead._id.toString()} className="border-b border-white/5 last:border-0">
                    <td className="px-6 py-5">
                      <Link
                        href={`/dashboard/leads/${lead._id.toString()}`}
                        className="text-sm font-medium text-white transition hover:text-blue-400"
                      >
                        {lead.name || "Anonymous Lead"}
                      </Link>

                      <p className="mt-1 text-xs text-zinc-600">{lead.phone || "No phone yet"}</p>
                    </td>

                    <td className="px-6 py-5 text-sm text-zinc-400">{lead.service || "—"}</td>

                    <td className="px-6 py-5 text-sm text-zinc-400">{lead.urgency || "—"}</td>

                    <td className="px-6 py-5">
                      <StatusBadge status={lead.status} />
                    </td>

                    <td className="px-6 py-5 text-sm text-zinc-500">
                      {new Date(lead.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
