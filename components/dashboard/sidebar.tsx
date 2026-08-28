"use client";

import {
  CalendarDays,
  ChartNoAxesCombined,
  LayoutDashboard,
  MessageSquareText,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/dashboard/logout-button";
const navigation = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Leads",
    href: "/dashboard/leads",
    icon: Users,
  },
  {
    label: "Appointments",
    href: "/dashboard/appointments",
    icon: CalendarDays,
  },
  {
    label: "Conversations",
    href: "/dashboard/conversations",
    icon: MessageSquareText,
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: ChartNoAxesCombined,

  },
];



export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-white/10 bg-zinc-950 lg:flex lg:flex-col">
      <div className="flex h-16 items-center border-b border-white/10 px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-bold text-black">
            L
          </div>

          <span className="font-semibold text-white">
            LeadFlow
            <span className="text-blue-400">AI</span>
          </span>
        </Link>
      </div>

      <div className="p-4">
        <p className="mb-3 px-3 text-xs font-medium uppercase tracking-wider text-zinc-600">
          Workspace
        </p>

        <nav className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;

            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                pathname.startsWith(item.href));

            // if (item.disabled) {
            //   return (
            //     <div
            //       key={item.href}
            //       className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-700"
            //     >
            //       <Icon size={18} />

            //       <span className="flex-1">
            //         {item.label}
            //       </span>

            //       <span className="text-[10px] uppercase">
            //         Soon
            //       </span>
            //     </div>
            //   );
            // }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active
                  ? "bg-white text-black"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  }`}
              >
                <Icon size={18} />

                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto border-t border-white/10 p-4">
        <Link
          href="/dashboard/settings"
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${pathname === "/dashboard/settings"
            ? "bg-white text-black"
            : "text-zinc-500 hover:bg-white/5 hover:text-white"
            }`}
        >
          <Settings size={18} />
          Settings
        </Link>
        <LogoutButton />
      
      </div>
    </aside>
  );
}