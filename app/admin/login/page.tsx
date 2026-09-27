import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { getCurrentAdmin } from "@/lib/admin-auth";

export default async function AdminLoginPage() {
  const admin = await getCurrentAdmin();

  if (admin) {
    redirect("/admin");
  }

  return (
    <main className="grid min-h-screen bg-[#050505] text-white lg:grid-cols-2">
      <section className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-black">
              <ShieldCheck size={18} />
            </div>

            <span className="text-lg font-semibold">Administration</span>
          </div>

          <div className="mt-12">
            <p className="text-sm font-medium uppercase tracking-widest text-blue-400">
              Super Admin
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight">Sign in to the platform.</h1>

            <p className="mt-3 text-zinc-500">
              Access business accounts, subscriptions, payments and platform operations.
            </p>
          </div>

          <AdminLoginForm />
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

          <h2 className="mt-7 text-3xl font-semibold tracking-tight">Platform administration.</h2>

          <p className="mt-4 leading-7 text-zinc-400">
            This area is restricted to authorized platform administrators.
          </p>
        </div>
      </section>
    </main>
  );
}
