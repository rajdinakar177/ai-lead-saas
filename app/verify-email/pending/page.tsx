import { MailCheck } from "lucide-react";
import Link from "next/link";

import { ResendVerification } from "@/components/auth/resend-verification";

type PageProps = {
  searchParams: Promise<{
    email?: string;
  }>;
};

export default async function VerificationPendingPage({ searchParams }: PageProps) {
  const { email } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] px-5 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
        <MailCheck size={40} className="mx-auto text-blue-400" />

        <h1 className="mt-6 text-2xl font-semibold">Check your email</h1>

        <p className="mt-3 text-sm leading-6 text-zinc-500">
          We sent you a verification link. Click it to activate your LeadFlow AI account.
        </p>

        {email && (
          <div className="mt-6 text-left">
            <ResendVerification email={email} />
          </div>
        )}

        <Link
          href="/login"
          className="mt-7 inline-block text-sm text-blue-400 hover:text-violet-300"
        >
          Back to login
        </Link>
      </div>
    </main>
  );
}
