import { ShieldCheck } from "lucide-react";

import { requireAdmin } from "@/lib/admin-auth";

export default async function AdminPage() {
  const admin = await requireAdmin();

  return (
    <main className="min-h-screen bg-[#050505] px-5 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
            <ShieldCheck size={20} />
          </div>

          <div>
            <p className="text-sm text-zinc-500">Super Admin</p>
            <h1 className="text-xl font-semibold">Platform Administration</h1>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <p className="text-sm text-zinc-500">Signed in as</p>

          <h2 className="mt-2 text-xl font-medium">{admin.name}</h2>

          <p className="mt-1 text-sm text-zinc-400">{admin.email}</p>
        </div>
      </div>
    </main>
  );
}