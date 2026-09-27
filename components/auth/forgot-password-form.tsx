"use client";

import { useState } from "react";
import { Loader2, Mail } from "lucide-react";

type SubmitState = "idle" | "submitting" | "success" | "error";

export function ForgotPasswordForm() {
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setState("submitting");
    setMessage("");

    const formData = new FormData(event.currentTarget);

    const email = String(formData.get("email") ?? "").trim();

    try {
      const response = await fetch("/api/auth/forgot-password", {
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
        setState("error");
        setMessage(data.error || "Unable to process password reset request.");
        return;
      }

      setState("success");
      setMessage(
        data.message ||
          "If an account exists for that email, a password reset link has been sent.",
      );
    } catch {
      setState("error");
      setMessage("Unable to process password reset request.");
    }
  }

  if (state === "success") {
    return (
      <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
            <Mail size={18} />
          </div>

          <div>
            <h2 className="font-medium text-white">Check your email</h2>

            <p className="mt-1 text-sm leading-6 text-zinc-400">{message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-medium text-zinc-300"
        >
          Email address
        </label>

        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
          placeholder="you@example.com"
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10"
        />
      </div>

      {state === "error" && message ? (
        <p className="text-sm text-red-400" role="alert">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={state === "submitting"}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state === "submitting" ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Sending...
          </>
        ) : (
          "Send reset link"
        )}
      </button>
    </form>
  );
}
