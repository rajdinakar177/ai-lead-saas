"use client";

import { useState } from "react";
import { CalendarDays, List } from "lucide-react";

import {
  AppointmentsList,
  type AppointmentListItem,
} from "@/components/dashboard/appointments-list";

import { AppointmentsCalendar } from "@/components/dashboard/appointments-calendar";

type Props = {
  appointments: AppointmentListItem[];
  timezone: string;
};

export function AppointmentsView({ appointments, timezone }: Props) {
  const [view, setView] = useState<"list" | "calendar">("list");

  const calendarAppointments = appointments.map((appointment) => ({
    id: appointment.id,

    scheduledFor: appointment.scheduledFor,

    status: appointment.status,

    service: appointment.lead?.service,

    customerName: appointment.lead?.name,
  }));

  return (
    <div className="mt-8">
      {/* View switcher */}
      <div className="mb-6 flex items-center justify-stretch sm:justify-end">
        <div className="flex w-full rounded-xl border border-white/10 bg-black/20 p-1 sm:w-auto">
          <button
            type="button"
            onClick={() => setView("list")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              view === "list"
                ? "bg-white/10 text-white"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            <List size={16} />
            List View
          </button>

          <button
            type="button"
            onClick={() => setView("calendar")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              view === "calendar"
                ? "bg-white/10 text-white"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            <CalendarDays size={16} />
            Calendar View
          </button>
        </div>
      </div>

      {view === "list" ? (
        <AppointmentsList appointments={appointments} timezone={timezone} />
      ) : (
        <AppointmentsCalendar
          appointments={calendarAppointments}
          timezone={timezone}
        />
      )}
    </div>
  );
}
