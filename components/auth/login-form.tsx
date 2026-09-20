"use client";

import { FormEvent, useState } from "react";
import { LoaderCircle, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { ResendVerification } from "@/components/auth/resend-verification";
export function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);

  const [verificationEmail, setVerificationEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/auth/login", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403 && data.code === "EMAIL_NOT_VERIFIED") {
          setNeedsVerification(true);
          setVerificationEmail(data.email || email);

          setError("Please verify your email before signing in.");

          return;
        }

        throw new Error(data.error || "Unable to login.");
      }

      router.push("/dashboard");

      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
      {needsVerification && <ResendVerification email={verificationEmail} />}
      <div>
        <label htmlFor="email" className="text-sm text-zinc-400">
          Email
        </label>

        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-violet-500/50"
        />
      </div>

      <div>
        <label htmlFor="password" className="text-sm text-zinc-400">
          Password
        </label>

        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoComplete="current-password"
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
            Signing in...
          </>
        ) : (
          <>
            Sign In
            <LogIn size={18} />
          </>
        )}
      </button>
    </form>
  );
}
