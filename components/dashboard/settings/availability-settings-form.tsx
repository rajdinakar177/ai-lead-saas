"use client";

import { CheckCircle2, Clock3, LoaderCircle, Save } from "lucide-react";
import { useState } from "react";

type AvailabilityDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

type DayAvailability = {
  day: AvailabilityDay;
  enabled: boolean;
  startTime: string;
  endTime: string;
};

type Availability = {
  slotDurationMinutes: number;
  bufferMinutes: number;
  days: DayAvailability[];
};

type Props = {
  initialAvailability?: Partial<Availability>;
};

const defaultDays: DayAvailability[] = [
  {
    day: "monday",
    enabled: true,
    startTime: "09:00",
    endTime: "17:00",
  },
  {
    day: "tuesday",
    enabled: true,
    startTime: "09:00",
    endTime: "17:00",
  },
  {
    day: "wednesday",
    enabled: true,
    startTime: "09:00",
    endTime: "17:00",
  },
  {
    day: "thursday",
    enabled: true,
    startTime: "09:00",
    endTime: "17:00",
  },
  {
    day: "friday",
    enabled: true,
    startTime: "09:00",
    endTime: "17:00",
  },
  {
    day: "saturday",
    enabled: true,
    startTime: "09:00",
    endTime: "13:00",
  },
  {
    day: "sunday",
    enabled: false,
    startTime: "09:00",
    endTime: "17:00",
  },
];

export function AvailabilitySettingsForm({ initialAvailability }: Props) {
  const [days, setDays] = useState<DayAvailability[]>(
    initialAvailability?.days?.length ? initialAvailability.days : defaultDays,
  );

  const [slotDurationMinutes, setSlotDurationMinutes] = useState(
    initialAvailability?.slotDurationMinutes ?? 60,
  );

  const [bufferMinutes, setBufferMinutes] = useState(
    initialAvailability?.bufferMinutes ?? 0,
  );

  const [loading, setLoading] = useState(false);

  const [success, setSuccess] = useState(false);

  const [error, setError] = useState<string | null>(null);

  function toggleDay(day: AvailabilityDay) {
    setDays((previous) =>
      previous.map((item) =>
        item.day === day
          ? {
              ...item,
              enabled: !item.enabled,
            }
          : item,
      ),
    );
  }

  function updateDayTime(
    day: AvailabilityDay,
    field: "startTime" | "endTime",
    value: string,
  ) {
    setDays((previous) =>
      previous.map((item) =>
        item.day === day
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const invalidDay = days.find(
        (day) => day.enabled && day.startTime >= day.endTime,
      );

      if (invalidDay) {
        throw new Error(
          `${formatDay(
            invalidDay.day,
          )}: closing time must be after opening time.`,
        );
      }

      const response = await fetch("/api/business/availability", {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          slotDurationMinutes,
          bufferMinutes,
          days,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save availability.");
      }

      setSuccess(true);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error ? error.message : "Unable to save availability.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.22)] sm:p-8"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-400/10 bg-blue-500/10 text-blue-400">
          <Clock3 size={20} />
        </div>

        <div>
          <h2 className="font-semibold text-white">Business Availability</h2>

          <p className="mt-1 text-sm leading-6 text-zinc-500">
            Set your working hours and appointment slot duration.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-6 flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-400">
          <CheckCircle2 size={17} />
          Availability updated.
        </div>
      )}

      {/* DAYS */}

      <div className="mt-8 space-y-3">
        {days.map((item) => (
          <div
            key={item.day}
            className="grid gap-4 rounded-2xl border border-white/[0.08] bg-black/10 p-4 sm:grid-cols-[150px_90px_1fr_1fr] sm:items-center"
          >
            <p className="text-sm font-medium capitalize text-white">
              {item.day}
            </p>

            <button
              type="button"
              onClick={() => toggleDay(item.day)}
              className={`relative h-7 w-12 rounded-full transition ${
                item.enabled ? "bg-blue-500" : "bg-zinc-800"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                  item.enabled ? "left-6" : "left-1"
                }`}
              />
            </button>

            {item.enabled ? (
              <>
                <div>
                  <label className="mb-2 block text-xs text-zinc-600">
                    Opens
                  </label>

                  <input
                    type="time"
                    value={item.startTime}
                    onChange={(event) =>
                      updateDayTime(item.day, "startTime", event.target.value)
                    }
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs text-zinc-600">
                    Closes
                  </label>

                  <input
                    type="time"
                    value={item.endTime}
                    onChange={(event) =>
                      updateDayTime(item.day, "endTime", event.target.value)
                    }
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                  />
                </div>
              </>
            ) : (
              <div className="text-sm text-zinc-600 sm:col-span-2">Closed</div>
            )}
          </div>
        ))}
      </div>

      {/* APPOINTMENT SETTINGS */}

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <div>
          <label className="text-sm text-zinc-400">Appointment Duration</label>

          <select
            value={slotDurationMinutes}
            onChange={(event) =>
              setSlotDurationMinutes(Number(event.target.value))
            }
            className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500/50"
          >
            <option value={30}>30 minutes</option>

            <option value={45}>45 minutes</option>

            <option value={60}>60 minutes</option>

            <option value={90}>90 minutes</option>

            <option value={120}>2 hours</option>
          </select>

          <p className="mt-2 text-xs leading-5 text-zinc-700">
            How long each customer appointment should last.
          </p>
        </div>

        <div>
          <label className="text-sm text-zinc-400">
            Buffer Between Appointments
          </label>

          <select
            value={bufferMinutes}
            onChange={(event) => setBufferMinutes(Number(event.target.value))}
            className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500/50"
          >
            <option value={0}>No buffer</option>

            <option value={15}>15 minutes</option>

            <option value={30}>30 minutes</option>

            <option value={45}>45 minutes</option>

            <option value={60}>60 minutes</option>
          </select>

          <p className="mt-2 text-xs leading-5 text-zinc-700">
            Extra time for travel, preparation, or cleanup.
          </p>
        </div>
      </div>

      {/* SAVE */}

      <div className="mt-8 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <LoaderCircle size={17} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={17} />
              Save Availability
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function formatDay(day: AvailabilityDay) {
  return day.charAt(0).toUpperCase() + day.slice(1);
}
