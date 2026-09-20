"use client";

import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function VerifyEmail({ token }: { token: string }) {
  const router = useRouter();

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );

  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    async function verify() {
      if (!token) {
        setStatus("error");

        setMessage("Verification token is missing.");

        return;
      }

      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            token,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to verify email.");
        }

        setStatus("success");

        setMessage("Your email has been verified.");

        setTimeout(() => {
          router.push("/dashboard");

          router.refresh();
        }, 1200);
      } catch (error) {
        setStatus("error");

        setMessage(
          error instanceof Error ? error.message : "Unable to verify email.",
        );
      }
    }

    verify();
  }, [router, token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] px-5 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
        {status === "loading" && (
          <LoaderCircle
            size={38}
            className="mx-auto animate-spin text-blue-400"
          />
        )}

        {status === "success" && (
          <CheckCircle2 size={40} className="mx-auto text-emerald-400" />
        )}

        {status === "error" && (
          <XCircle size={40} className="mx-auto text-red-400" />
        )}

        <h1 className="mt-6 text-2xl font-semibold">
          {status === "success"
            ? "Email verified"
            : status === "error"
              ? "Verification failed"
              : "Verifying email"}
        </h1>

        <p className="mt-3 text-sm leading-6 text-zinc-500">{message}</p>
      </div>
    </main>
  );
}
