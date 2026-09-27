"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, LoaderCircle, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ResetPasswordFormProps = {
  token: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      setError(null);

      if (!token) {
        throw new Error("Invalid or expired password reset link.");
      }

      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      const passwordByteLength = new TextEncoder().encode(password).length;

      if (passwordByteLength < 8) {
        throw new Error("Password must be at least 8 characters.");
      }

      if (passwordByteLength > 72) {
        throw new Error("Password is too long.");
      }

      const response = await fetch("/api/auth/reset-password", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to reset password.");
      }

      setSuccess(true);
      setPassword("");
      setConfirmPassword("");

      window.setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 2000);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to reset password.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="mt-8 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-4">
        <div className="flex items-start gap-3">
          <CheckCircle2
            size={20}
            className="mt-0.5 shrink-0 text-emerald-400"
          />

          <div>
            <p className="font-medium text-emerald-400">
              Password reset successfully.
            </p>

            <p className="mt-1 text-sm text-zinc-400">
              Redirecting you to login...
            </p>

            <Link
              href="/login"
              className="mt-3 inline-block text-sm text-blue-400 transition hover:text-violet-300"
            >
              Go to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      )}

      <div>
        <label htmlFor="password" className="text-sm text-zinc-400">
          New password
        </label>

        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-violet-500/50"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="text-sm text-zinc-400">
          Confirm new password
        </label>

        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-violet-500/50"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <LoaderCircle size={18} className="animate-spin" />
            Resetting password...
          </>
        ) : (
          <>
            Reset Password
            <LockKeyhole size={18} />
          </>
        )}
      </button>
    </form>
  );
}
