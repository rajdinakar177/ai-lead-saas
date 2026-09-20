import { Bell, Building2 } from "lucide-react";

import { requireBusiness } from "@/lib/auth";

type Props = {
  title: string;
  description: string;
};

export async function DashboardHeader({ title, description }: Props) {
  const business = await requireBusiness();

  return (
    <header className="flex flex-col gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          {title}
        </h1>

        <p className="mt-2 text-sm text-zinc-500">{description}</p>
      </div>

      <div className="flex items-center gap-3">
        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition hover:bg-white/5 hover:text-white">
          <Bell size={18} />
        </button>

        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
            <Building2 size={17} />
          </div>

          <div className="hidden sm:block">
            <p className="max-w-48 truncate text-sm font-medium text-white">
              {business.name}
            </p>

            <p className="max-w-48 truncate text-xs text-zinc-500">
              {business.industry}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
