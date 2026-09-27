import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getCurrentBusiness } from "@/lib/auth";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const business = await getCurrentBusiness();

  if (business) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  const token = params.token?.trim() ?? "";

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

            <h1 className="mt-4 text-4xl font-semibold tracking-tight">Create a new password.</h1>

            <p className="mt-3 text-zinc-500">Choose a new password for your business account.</p>
          </div>

          {token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <div className="mt-8 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-4">
              <p className="text-sm text-red-400">
                This password reset link is invalid or incomplete.
              </p>

              <Link
                href="/forgot-password"
                className="mt-3 inline-block text-sm text-blue-400 transition hover:text-violet-300"
              >
                Request a new reset link
              </Link>
            </div>
          )}

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
            <ShieldCheck size={24} />
          </div>

          <h2 className="mt-7 text-3xl font-semibold tracking-tight">
            Protect your account with a new password.
          </h2>

          <p className="mt-4 leading-7 text-zinc-400">
            After your password is changed, your existing login sessions will be invalidated for
            security.
          </p>
        </div>
      </section>
    </main>
  );
}
