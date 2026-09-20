"use client";

import { useMemo, useState } from "react";
import { CalendarDays, MapPin, Phone, Search, User, Zap } from "lucide-react";
import Link from "next/link";
import { AppointmentActions } from "@/components/dashboard/appointment-actions";

type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "cancelled";

type PeriodFilter = "all" | "upcoming" | "past";

export type AppointmentListItem = {
  id: string;
  scheduledFor: string;
  status: AppointmentStatus;

  lead: {
    id: string;
    name?: string;
    phone?: string;
    service?: string;
    urgency?: string;
    location?: string;
  } | null;
};

type Props = {
  appointments: AppointmentListItem[];
  timezone: string;
};

function getStatusClasses(status: AppointmentStatus) {
  switch (status) {
    case "completed":
      return "bg-emerald-500/10 text-emerald-400";

    case "cancelled":
      return "bg-red-500/10 text-red-400";

    case "confirmed":
      return "bg-blue-500/10 text-blue-400";

    default:
      return "bg-amber-500/10 text-amber-400";
  }
}

function getUrgencyClasses(urgency?: string) {
  switch (urgency?.toLowerCase()) {
    case "urgent":
      return "bg-red-500/10 text-red-400";

    case "high":
      return "bg-orange-500/10 text-orange-400";

    case "medium":
      return "bg-amber-500/10 text-amber-400";

    case "low":
      return "bg-emerald-500/10 text-emerald-400";

    default:
      return "bg-white/5 text-zinc-400";
  }
}

function formatAppointmentLabel(scheduledFor: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(scheduledFor));
}

export function AppointmentsList({ appointments, timezone }: Props) {
  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<"all" | AppointmentStatus>(
    "all",
  );

  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");

  const filteredAppointments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const now = new Date();

    return appointments.filter((appointment) => {
      const lead = appointment.lead;

      /*
       * Search
       */
      const matchesSearch =
        !normalizedSearch ||
        [
          lead?.name,
          lead?.phone,
          lead?.service,
          lead?.location,
          lead?.urgency,
        ].some((value) => value?.toLowerCase().includes(normalizedSearch));

      /*
       * Status
       */
      const matchesStatus =
        statusFilter === "all" || appointment.status === statusFilter;

      /*
       * Period
       */
      const appointmentDate = new Date(appointment.scheduledFor);

      let matchesPeriod = true;

      if (periodFilter === "upcoming") {
        matchesPeriod =
          appointmentDate > now &&
          appointment.status !== "cancelled" &&
          appointment.status !== "completed";
      }

      if (periodFilter === "past") {
        matchesPeriod = appointmentDate <= now;
      }

      return matchesSearch && matchesStatus && matchesPeriod;
    });
  }, [appointments, search, statusFilter, periodFilter]);

  return (
    <>
      {/* Filters */}
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, phone, service or location..."
              className="h-11 w-full rounded-xl border border-white/10 bg-black/20 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-500/40"
            />
          </div>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "all" | AppointmentStatus)
            }
            className="h-11 rounded-xl border border-white/10 bg-zinc-950 px-4 text-sm text-zinc-300 outline-none transition focus:border-blue-500/40 lg:w-44"
          >
            <option value="all">All statuses</option>

            <option value="scheduled">Scheduled</option>

            <option value="confirmed">Confirmed</option>

            <option value="completed">Completed</option>

            <option value="cancelled">Cancelled</option>
          </select>

          {/* Period */}
          <select
            value={periodFilter}
            onChange={(event) =>
              setPeriodFilter(event.target.value as PeriodFilter)
            }
            className="h-11 rounded-xl border border-white/10 bg-zinc-950 px-4 text-sm text-zinc-300 outline-none transition focus:border-blue-500/40 lg:w-40"
          >
            <option value="all">All dates</option>

            <option value="upcoming">Upcoming</option>

            <option value="past">Past</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="mt-5 grid gap-4">
        {filteredAppointments.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-12 text-center">
            <CalendarDays size={28} className="mx-auto text-zinc-700" />

            <p className="mt-4 text-sm text-zinc-500">
              No appointments match your filters.
            </p>
          </div>
        ) : (
          filteredAppointments.map((appointment) => {
            const lead = appointment.lead;

            return (
              <div
                key={appointment.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
              >
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                      <CalendarDays size={20} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white">
                        {formatAppointmentLabel(
                          appointment.scheduledFor,
                          timezone,
                        )}
                      </p>

                      <p className="mt-1 text-sm text-zinc-500">
                        {lead?.service || "Service appointment"}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-zinc-400">
                        <span className="flex items-center gap-2">
                          <User size={15} className="text-zinc-600" />

                          {lead?.name || "Unknown lead"}
                        </span>

                        {lead?.phone && (
                          <span className="flex items-center gap-2">
                            <Phone size={15} className="text-zinc-600" />

                            {lead.phone}
                          </span>
                        )}

                        {lead?.location && (
                          <span className="flex items-center gap-2">
                            <MapPin size={15} className="text-zinc-600" />

                            {lead.location}
                          </span>
                        )}

                        {lead?.urgency && (
                          <span
                            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getUrgencyClasses(
                              lead.urgency,
                            )}`}
                          >
                            <Zap size={12} />

                            {lead.urgency}
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/dashboard/appointments/${appointment.id}`}
                        className="mt-5 inline-flex rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-zinc-400 transition hover:border-blue-500/30 hover:bg-blue-500/5 hover:text-blue-400"
                      >
                        View Details
                      </Link>
                      {lead?.id && (
                        <AppointmentActions
                          appointmentId={appointment.id}
                          leadId={lead.id}
                          status={appointment.status}
                        />
                      )}
                    </div>
                  </div>

                  <span
                    className={`w-fit shrink-0 rounded-full px-3 py-1.5 text-xs font-medium capitalize ${getStatusClasses(
                      appointment.status,
                    )}`}
                  >
                    {appointment.status}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
