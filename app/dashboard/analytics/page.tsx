import {
  CalendarCheck,
  CircleGauge,
  Flame,
  TrendingUp,
  Users,
} from "lucide-react";

import { connectDB } from "@/lib/mongodb";
import { requireBusiness } from "@/lib/auth";
import { Lead } from "@/models/Lead";
import { Appointment } from "@/models/Appointment";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { StatCard } from "@/components/dashboard/stat-card";

export const dynamic = "force-dynamic";

type StatusCount = {
  _id: string;
  count: number;
};

type ServiceCount = {
  _id: string;
  count: number;
};

type DailyCount = {
  _id: string;
  count: number;
};

export default async function AnalyticsPage() {
  await connectDB();

  const business =
    await requireBusiness();

  if (!business) {
    return <div>Business not found.</div>;
  }

  const businessId =
    business._id;

  const [
    totalLeads,
    bookedLeads,
    hotLeads,
    appointmentCount,
    statusBreakdown,
    serviceBreakdown,
    dailyLeads,
  ] = await Promise.all([
    Lead.countDocuments({
      businessId,
    }),

    Lead.countDocuments({
      businessId,
      status: "booked",
    }),

    Lead.countDocuments({
      businessId,
      status: {
        $in: ["hot", "qualified", "booked"],
      },
    }),

    Appointment.countDocuments({
      businessId,
    }),

    Lead.aggregate<StatusCount>([
      {
        $match: {
          businessId,
        },
      },
      {
        $group: {
          _id: "$status",
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
    ]),

    Lead.aggregate<ServiceCount>([
      {
        $match: {
          businessId,
          service: {
            $nin: [null, ""],
          },
        },
      },
      {
        $group: {
          _id: "$service",
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
      {
        $limit: 6,
      },
    ]),

    Lead.aggregate<DailyCount>([
      {
        $match: {
          businessId,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
      {
        $limit: 14,
      },
    ]),
  ]);

  const conversionRate =
    totalLeads === 0
      ? 0
      : Math.round(
        (bookedLeads / totalLeads) * 100
      );

  const hotLeadRate =
    totalLeads === 0
      ? 0
      : Math.round(
        (hotLeads / totalLeads) * 100
      );

  return (
    <div>
      <DashboardHeader
        title="Analytics"
        description="Track lead quality, booking performance, and service demand."
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Leads"
          value={totalLeads}
          description="All leads captured"
          icon="users"
        />

        <StatCard
          label="Booking Rate"
          value={`${conversionRate}%`}
          description="Leads converted into appointments"
          icon="trend"
        />

        <StatCard
          label="Hot Lead Rate"
          value={`${hotLeadRate}%`}
          description="High-intent leads"
          icon="flame"
        />

        <StatCard
          label="Appointments"
          value={appointmentCount}
          description="Appointments created"
          icon="calendar-check"
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div>
            <h2 className="font-semibold text-white">
              Lead Status Breakdown
            </h2>

            <p className="mt-1 text-sm text-zinc-600">
              Distribution of leads by current status.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {statusBreakdown.length === 0 ? (
              <p className="text-sm text-zinc-600">
                No lead data yet.
              </p>
            ) : (
              statusBreakdown.map((item) => {
                const percentage =
                  totalLeads === 0
                    ? 0
                    : Math.round(
                      (item.count /
                        totalLeads) *
                      100
                    );

                return (
                  <div key={item._id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize text-zinc-300">
                        {item._id}
                      </span>

                      <span className="text-zinc-600">
                        {item.count} ·{" "}
                        {percentage}%
                      </span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-violet-500"
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div>
            <h2 className="font-semibold text-white">
              Top Services
            </h2>

            <p className="mt-1 text-sm text-zinc-600">
              Services requested most often.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {serviceBreakdown.length === 0 ? (
              <p className="text-sm text-zinc-600">
                No service data yet.
              </p>
            ) : (
              serviceBreakdown.map(
                (item, index) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-sm text-zinc-500">
                        {index + 1}
                      </div>

                      <span className="text-sm text-zinc-300">
                        {item._id}
                      </span>
                    </div>

                    <span className="text-sm font-medium text-white">
                      {item.count}
                    </span>
                  </div>
                )
              )
            )}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_0.5fr]">
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div>
            <h2 className="font-semibold text-white">
              Lead Activity
            </h2>

            <p className="mt-1 text-sm text-zinc-600">
              Leads created by day.
            </p>
          </div>

          <div className="mt-8">
            {dailyLeads.length === 0 ? (
              <p className="text-sm text-zinc-600">
                No activity yet.
              </p>
            ) : (
              <div className="flex h-52 items-end gap-3">
                {dailyLeads.map((item) => {
                  const maxCount =
                    Math.max(
                      ...dailyLeads.map(
                        (entry) =>
                          entry.count
                      )
                    ) || 1;

                  const height =
                    Math.max(
                      12,
                      (item.count /
                        maxCount) *
                      100
                    );

                  return (
                    <div
                      key={item._id}
                      className="flex min-w-0 flex-1 flex-col items-center gap-3"
                    >
                      <div className="flex h-40 w-full items-end rounded-xl bg-white/[0.03] px-1">
                        <div
                          className="w-full rounded-lg bg-violet-500"
                          style={{
                            height: `${height}%`,
                          }}
                        />
                      </div>

                      <div className="text-center">
                        <p className="text-xs font-medium text-zinc-400">
                          {item.count}
                        </p>

                        <p className="mt-1 truncate text-[10px] text-zinc-700">
                          {formatDate(
                            item._id
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
            <CircleGauge size={21} />
          </div>

          <p className="mt-6 text-sm text-zinc-500">
            Lead Conversion
          </p>

          <p className="mt-2 text-5xl font-semibold tracking-tight text-white">
            {conversionRate}%
          </p>

          <p className="mt-4 text-sm leading-6 text-zinc-600">
            {bookedLeads} of{" "}
            {totalLeads} leads have
            reached booked status.
          </p>
        </section>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(
    `${value}T00:00:00`
  );

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
    }
  );
}