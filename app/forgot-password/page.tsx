import { ArrowLeft, KeyRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getCurrentBusiness } from "@/lib/auth";

export default async function ForgotPasswordPage() {
  const business = await getCurrentBusiness();

  if (business) {
    redirect("/dashboard");
  }

  return (
    <main className="grid min-h-screen bg-[#050505] text-white lg:grid-cols-2">
      <section className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-sm font-bold text-black">
              L
            </div>
          </Link>

          <div className="mt-12">
            <p className="text-sm font-medium uppercase tracking-widest text-blue-400">
              Account Recovery
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight">Forgot your password?</h1>

            <p className="mt-3 text-zinc-500">
              Enter your account email and we'll send you a secure password reset link.
            </p>
          </div>

          <ForgotPasswordForm />

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-blue-400 transition hover:text-violet-300"
            >
              <ArrowLeft size={16} />
              Back to login
            </Link>
          </div>
        </div>
      </section>

      <section className="relative hidden overflow-hidden border-l border-white/10 bg-zinc-950 lg:flex lg:items-center lg:justify-center">
        <div className="absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/10 blur-[120px]" />
        </div>

        <div className="relative max-w-lg px-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
            <KeyRound size={24} />
          </div>

          <h2 className="mt-7 text-3xl font-semibold tracking-tight">
            Securely recover access to your business workspace.
          </h2>

          <p className="mt-4 leading-7 text-zinc-400">
            Password reset links are temporary and can only be used once.
          </p>
        </div>
      </section>
    </main>
  );
}
