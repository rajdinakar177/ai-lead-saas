"use client";

import {
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  Unplug,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  useState,
} from "react";

type Props = {
  integration: {
    connected: boolean;
    googleEmail: string | null;
    calendarId: string;
  } | null;
};

export function GoogleCalendarSettings({
  integration,
}: Props) {
  const router =
    useRouter();

  const connected =
    integration?.connected === true;

  const [
    disconnecting,
    setDisconnecting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  function handleConnect() {
    window.location.href =
      "/api/integrations/google-calendar/connect";
  }

  async function handleDisconnect() {
    if (disconnecting) {
      return;
    }

    const confirmed =
      window.confirm(
        "Disconnect Google Calendar? Future Leadquivo appointments will no longer sync to this Google account."
      );

    if (!confirmed) {
      return;
    }

    try {
      setDisconnecting(true);
      setError(null);

      const response =
        await fetch(
          "/api/integrations/google-calendar/disconnect",
          {
            method: "POST",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to disconnect Google Calendar."
        );
      }

      /*
       * SettingsPage is a Server Component.
       * Refresh it so the integration status
       * is loaded again from MongoDB.
       */
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to disconnect Google Calendar."
      );
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
            <CalendarDays
              size={22}
            />
          </div>

          <div>
            <h3 className="font-semibold text-white">
              Google Calendar
            </h3>

            <p className="mt-1 max-w-xl text-sm leading-6 text-zinc-500">
              Connect your Google Calendar so
              Leadquivo appointments can stay
              synced with your business
              calendar.
            </p>
          </div>
        </div>

        {connected ? (
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs font-medium text-emerald-400">
            <CheckCircle2
              size={14}
            />

            Connected
          </div>
        ) : (
          <div className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-500">
            Not connected
          </div>
        )}
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {connected ? (
        <div className="mt-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoCard
              label="Connected Account"
              value={
                integration?.googleEmail ||
                "Google account"
              }
            />

            <InfoCard
              label="Calendar"
              value={
                integration?.calendarId ===
                "primary"
                  ? "Primary calendar"
                  : integration
                      ?.calendarId ||
                    "Primary calendar"
              }
            />
          </div>

          <div className="mt-6 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-500">
              New bookings, reschedules and
              cancellations are synced with
              Google Calendar.
            </p>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={
                  handleConnect
                }
                disabled={
                  disconnecting
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ExternalLink
                  size={16}
                />

                Reconnect
              </button>

              <button
                type="button"
                onClick={
                  handleDisconnect
                }
                disabled={
                  disconnecting
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {disconnecting ? (
                  <>
                    <LoaderCircle
                      size={16}
                      className="animate-spin"
                    />

                    Disconnecting...
                  </>
                ) : (
                  <>
                    <Unplug
                      size={16}
                    />

                    Disconnect
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-7 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-white">
              Connect your business calendar
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              New appointments will be able
              to sync with your Google
              Calendar.
            </p>
          </div>

          <button
            type="button"
            onClick={
              handleConnect
            }
            className="inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
          >
            <CalendarDays
              size={17}
            />

            Connect Google Calendar
          </button>
        </div>
      )}
    </div>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-wider text-zinc-600">
        {label}
      </p>

      <p className="mt-2 break-all text-sm font-medium text-zinc-200">
        {value}
      </p>
    </div>
  );
}