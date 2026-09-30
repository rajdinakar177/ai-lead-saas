"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  businessId: string;
  status: string;
  numberSid: string | null;
  paidPro: boolean;
};

export function SmsNumberActions({
  businessId,
  status,
  numberSid,
  paidPro,
}: Props) {
  const router = useRouter();
  const [sid, setSid] = useState(numberSid ?? "");
  const [charges, setCharges] = useState(false);
  const [registration, setRegistration] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  async function act(action: string) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/admin/sms-numbers/${businessId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          numberSid: sid.trim(),
          confirmCharges: charges,
          confirmRegistration: registration,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Setup failed.");
      setSuccess(
        action === "activate"
          ? "SMS activated."
          : "Setup saved. Refresh to see the current state.",
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : "Setup failed.");
    } finally {
      setBusy(false);
      router.refresh();
    }
  }
  const button =
    "rounded-lg border border-white/20 px-4 py-2 text-sm disabled:opacity-40";
  return (
    <div className="mt-4 space-y-3">
      {!paidPro && (
        <p className="text-sm text-amber-300">
          Number assignment requires active paid Pro. Trial customers can
          request setup.
        </p>
      )}
      {status === "requested" && (
        <div className="space-y-3">
          <label className="flex items-start gap-2 text-sm text-zinc-400">
            <input
              type="checkbox"
              checked={charges}
              onChange={(e) => setCharges(e.target.checked)}
            />
            I approve purchasing one number and the recurring Twilio charges.
          </label>
          <button
            className={button}
            disabled={busy || !paidPro || !charges}
            onClick={() => act("purchase")}
          >
            {busy ? "Working..." : "Purchase dedicated number"}
          </button>
        </div>
      )}
      {["unconfigured", "requested", "registration_pending"].includes(
        status,
      ) && (
        <div className="flex flex-wrap gap-2">
          <label className="text-sm text-zinc-400">
            Existing Twilio number SID
            <input
              aria-label="Existing Twilio number SID"
              value={sid}
              onChange={(e) => setSid(e.target.value)}
              placeholder="PN..."
              className="ml-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white"
            />
          </label>
          <button
            className={button}
            disabled={busy || !paidPro || !/^PN[a-f\d]{32}$/i.test(sid.trim())}
            onClick={() => act("assign")}
          >
            Assign / repair existing number
          </button>
        </div>
      )}
      {["provisioning", "needs_review"].includes(status) && (
        <div>
          <p className="mb-2 text-sm text-zinc-400">
            Reconciliation checks Twilio for an existing number. It never
            purchases another number. Wait two minutes if setup is still
            running.
          </p>
          <button
            className={button}
            disabled={busy || !paidPro}
            onClick={() => act("reconcile")}
          >
            Reconcile unfinished setup
          </button>
        </div>
      )}
      {status === "registration_pending" && (
        <div className="space-y-3">
          <label className="flex items-start gap-2 text-sm text-zinc-400">
            <input
              type="checkbox"
              checked={registration}
              onChange={(e) => setRegistration(e.target.checked)}
            />
            I verified this customer's approved messaging registration, number
            association and inbound routing in Twilio Console.
          </label>
          <button
            className={button}
            disabled={busy || !paidPro || !registration}
            onClick={() => act("activate")}
          >
            Activate registered SMS number
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="text-sm text-emerald-400">
          {success}
        </p>
      )}
    </div>
  );
}
