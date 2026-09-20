"use client";

import { useRouter } from "next/navigation";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "cancelled";

type AppointmentCalendarItem = {
  id: string;
  scheduledFor: string;
  status: AppointmentStatus;

  service?: string | null;
  customerName?: string | null;
};

type AppointmentsCalendarProps = {
  appointments: AppointmentCalendarItem[];
  timezone: string;
};

function getEventClasses(status: AppointmentStatus) {
  switch (status) {
    case "confirmed":
      return ["lf-calendar-event", "lf-calendar-event-confirmed"];

    case "completed":
      return ["lf-calendar-event", "lf-calendar-event-completed"];

    case "cancelled":
      return ["lf-calendar-event", "lf-calendar-event-cancelled"];

    case "scheduled":
    default:
      return ["lf-calendar-event", "lf-calendar-event-scheduled"];
  }
}

export function AppointmentsCalendar({
  appointments,
  timezone,
}: AppointmentsCalendarProps) {
  const router = useRouter();

  const events = appointments.map((appointment) => ({
    id: appointment.id,

    title: [appointment.service || "Appointment", appointment.customerName]
      .filter(Boolean)
      .join(" — "),

    start: appointment.scheduledFor,

    classNames: getEventClasses(appointment.status),

    extendedProps: {
      status: appointment.status,
    },
  }));

  return (
    <div className="appointments-calendar min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/2 p-2 sm:p-6">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        timeZone={timezone}
        events={events}
        height="auto"
        nowIndicator
        dayMaxEvents
        displayEventTime
        eventDisplay="block"
        eventTimeFormat={{
          hour: "numeric",
          minute: "2-digit",
          meridiem: "short",
        }}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        buttonText={{
          today: "Today",
          month: "Month",
          week: "Week",
          day: "Day",
        }}
        eventClick={(info) => {
          router.push(`/dashboard/appointments/${info.event.id}`);
        }}
        eventDidMount={(info) => {
          const status = info.event.extendedProps.status as AppointmentStatus;

          info.el.setAttribute("data-status", status);

          info.el.setAttribute("title", `${info.event.title} — ${status}`);
        }}
      />
    </div>
  );
}
