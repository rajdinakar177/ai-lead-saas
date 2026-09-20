"use client";

import { CheckCircle2, LoaderCircle, Mail } from "lucide-react";
import { useState } from "react";

type Props = {
  email: string;
};

export function ResendVerification({ email }: Props) {
  const [loading, setLoading] = useState(false);

  const [success, setSuccess] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function resend() {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to resend verification email.");
      }

      setSuccess(true);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to resend verification email.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-blue-500/20 bg-violet-500/5 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
          <Mail size={17} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">
            Email verification required
          </p>

          <p className="mt-1 break-all text-xs leading-5 text-zinc-500">
            We can send a new verification link to {email}.
          </p>

          {success ? (
            <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 size={15} />
              Verification email sent.
            </div>
          ) : (
            <button
              type="button"
              onClick={resend}
              disabled={loading}
              className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-blue-400 transition hover:text-violet-300 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <LoaderCircle size={15} className="animate-spin" />
                  Sending...
                </>
              ) : (
                "Resend verification email"
              )}
            </button>
          )}

          {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}
