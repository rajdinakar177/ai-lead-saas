import { Bot, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { RegisterForm } from "@/components/auth/register-form";
import { redirect } from "next/navigation";
import { getCurrentBusiness } from "@/lib/auth";
export default async function RegisterPage() {
  const business = await getCurrentBusiness();

  if (business) {
    redirect("/dashboard");
  }
  return (
    <main className="grid min-h-screen bg-[#050505] text-white lg:grid-cols-2">
      <section className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-lg">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-sm font-bold text-black">
              L
            </div>

            <span className="text-lg font-semibold">
              LeadFlow
              <span className="text-blue-400">AI</span>
            </span>
          </Link>

          <div className="mt-10">
            <p className="text-sm font-medium uppercase tracking-widest text-blue-400">
              Create Account
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              Start converting more leads.
            </h1>

            <p className="mt-3 text-zinc-500">
              Create your business workspace and start managing leads, conversations and
              appointments.
            </p>
          </div>

          <RegisterForm />

          <p className="mt-6 text-center text-sm text-zinc-600">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-400 hover:text-violet-300">
              Sign in
            </Link>
          </p>
        </div>
      </section>

      <section className="relative hidden overflow-hidden border-l border-white/10 bg-zinc-950 lg:flex lg:items-center lg:justify-center">
        <div className="absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/10 blur-[120px]" />
        </div>

        <div className="relative max-w-lg px-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
            <Bot size={24} />
          </div>

          <h2 className="mt-7 text-3xl font-semibold tracking-tight">
            One workspace for your entire lead flow.
          </h2>

          <div className="mt-8 space-y-4">
            {[
              "Capture every website lead",
              "AI-powered qualification",
              "Appointment tracking",
              "Conversation history",
              "Business analytics",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-zinc-400">
                <CheckCircle2 size={18} className="text-emerald-400" />

                {feature}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
