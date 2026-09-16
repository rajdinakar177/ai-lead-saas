"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  LoaderCircle,
  X,
  XCircle,
} from "lucide-react";

type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled";

type Timeline =
  | "Today"
  | "Tomorrow"
  | "This week"
  | "Next week";

type AppointmentSlot = {
  label: string;
  scheduledFor: string;
};

type Props = {
  appointmentId: string;
  leadId: string;
  status: AppointmentStatus;
};

const timelines: Timeline[] = [
  "Today",
  "Tomorrow",
  "This week",
  "Next week",
];

export function AppointmentActions({
  appointmentId,
  leadId,
  status,
}: Props) {
  const router = useRouter();

  const [
    loadingStatus,
    setLoadingStatus,
  ] = useState<
    AppointmentStatus | null
  >(null);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  const [
    showReschedule,
    setShowReschedule,
  ] = useState(false);

  const [
    selectedTimeline,
    setSelectedTimeline,
  ] = useState<Timeline | null>(
    null
  );

  const [
    slots,
    setSlots,
  ] = useState<AppointmentSlot[]>(
    []
  );

  const [
    loadingSlots,
    setLoadingSlots,
  ] = useState(false);

  const [
    reschedulingSlot,
    setReschedulingSlot,
  ] = useState<string | null>(
    null
  );

  async function updateStatus(
    nextStatus: AppointmentStatus
  ) {
    try {
      setLoadingStatus(
        nextStatus
      );

      setError(null);

      const response =
        await fetch(
          `/api/appointments/${appointmentId}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                status:
                  nextStatus,
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Unable to update appointment."
        );
      }

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to update appointment."
      );
    } finally {
      setLoadingStatus(null);
    }
  }

  async function loadSlots(
    timeline: Timeline
  ) {
    try {
      setSelectedTimeline(
        timeline
      );

      setLoadingSlots(true);

      setError(null);

      setSlots([]);

      const params =
        new URLSearchParams({
          leadId,
          timeline,
          appointmentId,
        });

      const response =
        await fetch(
          `/api/availability?${params.toString()}`,
          {
            cache: "no-store",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Unable to load available appointments."
        );
      }

      setSlots(
        data.slots ?? []
      );
    } catch (error) {
      setSlots([]);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load available appointments."
      );
    } finally {
      setLoadingSlots(false);
    }
  }

  async function rescheduleAppointment(
    slot: AppointmentSlot
  ) {
    if (!selectedTimeline) {
      return;
    }

    try {
      setReschedulingSlot(
        slot.scheduledFor
      );

      setError(null);

      const response =
        await fetch(
          `/api/appointments/${appointmentId}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "reschedule",

                timeline:
                  selectedTimeline,

                scheduledFor:
                  slot.scheduledFor,
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Unable to reschedule appointment."
        );
      }

      setShowReschedule(false);

      setSelectedTimeline(null);

      setSlots([]);

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to reschedule appointment."
      );
    } finally {
      setReschedulingSlot(null);
    }
  }

  function toggleReschedule() {
    setShowReschedule(
      (current) => !current
    );

    setError(null);

    if (showReschedule) {
      setSelectedTimeline(null);
      setSlots([]);
    }
  }

  if (
    status === "completed" ||
    status === "cancelled"
  ) {
    return null;
  }

  const isBusy =
    loadingStatus !== null ||
    reschedulingSlot !== null;

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        {status === "scheduled" ? (
          <button
            type="button"
            disabled={isBusy}
            onClick={() =>
              updateStatus(
                "confirmed"
              )
            }
            className="inline-flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-400 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingStatus ===
              "confirmed" ? (
              <LoaderCircle
                size={14}
                className="animate-spin"
              />
            ) : (
              <BadgeCheck
                size={14}
              />
            )}

            Confirm
          </button>
        ) : null}

        <button
          type="button"
          disabled={isBusy}
          onClick={
            toggleReschedule
          }
          className="inline-flex items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs font-medium text-violet-300 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {showReschedule ? (
            <X size={14} />
          ) : (
            <CalendarClock
              size={14}
            />
          )}

          {showReschedule
            ? "Close"
            : "Reschedule"}
        </button>

        <button
          type="button"
          disabled={isBusy}
          onClick={() =>
            updateStatus(
              "completed"
            )
          }
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingStatus ===
            "completed" ? (
            <LoaderCircle
              size={14}
              className="animate-spin"
            />
          ) : (
            <CheckCircle2
              size={14}
            />
          )}

          Complete
        </button>

        <button
          type="button"
          disabled={isBusy}
          onClick={() =>
            updateStatus(
              "cancelled"
            )
          }
          className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingStatus ===
            "cancelled" ? (
            <LoaderCircle
              size={14}
              className="animate-spin"
            />
          ) : (
            <XCircle
              size={14}
            />
          )}

          Cancel
        </button>
      </div>

      {showReschedule ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2">
            <CalendarClock
              size={16}
              className="text-violet-400"
            />

            <p className="text-sm font-medium text-white">
              Choose a new appointment
            </p>
          </div>

          <p className="mt-1 text-xs text-zinc-500">
            Select a period to see
            available times.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {timelines.map(
              (timeline) => (
                <button
                  key={timeline}
                  type="button"
                  disabled={
                    loadingSlots ||
                    isBusy
                  }
                  onClick={() =>
                    loadSlots(
                      timeline
                    )
                  }
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs transition disabled:cursor-not-allowed disabled:opacity-50 ${selectedTimeline ===
                    timeline
                    ? "border-violet-500/40 bg-violet-500/20 text-violet-200"
                    : "border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                    }`}
                >
                  {timeline}

                  <ChevronDown
                    size={12}
                  />
                </button>
              )
            )}
          </div>

          {loadingSlots ? (
            <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
              <LoaderCircle
                size={14}
                className="animate-spin"
              />

              Loading available
              appointments...
            </div>
          ) : null}

          {!loadingSlots &&
            selectedTimeline &&
            slots.length === 0 ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-zinc-500">
              No appointment times
              are available for this
              period.
            </div>
          ) : null}

          {!loadingSlots &&
            slots.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {slots.map(
                (slot) => (
                  <button
                    key={
                      slot.scheduledFor
                    }
                    type="button"
                    disabled={
                      isBusy
                    }
                    onClick={() =>
                      rescheduleAppointment(
                        slot
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-200 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {reschedulingSlot ===
                      slot.scheduledFor ? (
                      <LoaderCircle
                        size={13}
                        className="animate-spin"
                      />
                    ) : (
                      <ClockIcon />
                    )}

                    {slot.label}
                  </button>
                )
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 text-xs text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ClockIcon() {
  return (
    <span className="h-2 w-2 rounded-full bg-current opacity-60" />
  );
}