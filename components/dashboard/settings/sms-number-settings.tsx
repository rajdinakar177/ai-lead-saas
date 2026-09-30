"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  setup: {
    eligible: boolean;
    number: string | null;
    status: string;
    areaCode: string;
  };
};

const labels: Record<string, string> = {
  unconfigured: "Not set up",
  requested: "Request received",
  provisioning: "Setting up your number",
  needs_review: "Support is reviewing your setup",
  registration_pending: "Messaging registration pending",
  ready: "Ready to send and receive SMS",
};

export function SmsNumberSettings({ setup }: Props) {
  const router = useRouter();
  const [areaCode, setAreaCode] = useState(setup.areaCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canRequest =
    setup.eligible &&
    !setup.number &&
    ["unconfigured", "requested"].includes(setup.status);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/business/sms-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areaCode }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to request a number.");
      setSuccess(
        "Your request is saved. Support will complete number and messaging setup.",
      );
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to request a number.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
      <h2 className="text-xl font-semibold">Business SMS number</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-400">
        Pro includes setup of a dedicated business number. Support completes
        messaging registration before SMS is enabled. Area code availability can
        vary.
      </p>
      <p className="mt-4 text-sm text-violet-300">
        {labels[setup.status] ?? "Not set up"}
      </p>
      {setup.number && (
        <p className="mt-2 text-2xl font-semibold tracking-wide">
          {setup.number}
        </p>
      )}
      {setup.number && setup.status === "unconfigured" && (
        <p className="mt-2 text-sm text-zinc-400">
          Contact support to verify and activate your existing number.
        </p>
      )}
      {!setup.eligible && (
        <p className="mt-4 text-sm text-zinc-400">
          An active or trialing Pro plan is required to request setup.{" "}
          <Link
            href="/dashboard/subscription"
            className="text-violet-300 underline"
          >
            View billing
          </Link>
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="mt-4 text-sm text-emerald-400">
          {success}
        </p>
      )}
      {canRequest && (
        <form onSubmit={submit} className="mt-5 flex flex-wrap items-end gap-3">
          <label className="text-sm text-zinc-400">
            Preferred US area code
            <input
              value={areaCode}
              onChange={(e) =>
                setAreaCode(e.target.value.replace(/\D/g, "").slice(0, 3))
              }
              inputMode="numeric"
              pattern="[2-9][0-9]{2}"
              maxLength={3}
              required
              placeholder="512"
              className="mt-2 block w-40 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            />
          </label>
          <button
            disabled={loading}
            className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-black disabled:opacity-50"
          >
            {loading
              ? "Saving..."
              : setup.status === "requested"
                ? "Update request"
                : "Request SMS setup"}
          </button>
        </form>
      )}
      <button
        type="button"
        onClick={() => router.refresh()}
        className="mt-4 text-sm text-zinc-400 underline"
      >
        Refresh status
      </button>
    </section>
  );
}
