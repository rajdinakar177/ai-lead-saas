"use client";

import { useEffect, useState } from "react";

import {
  Bot,
  CalendarDays,
  ChartNoAxesCombined,
  Clock3,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  Settings,
  Users,
  X,
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
  {
    label: "AI Settings",
    href: "/dashboard/ai-settings",
    icon: Bot,
  },
  {
    label: "Availability",
    href: "/dashboard/availability",
    icon: Clock3,
  },
  {
    label: "Google Calendar",
    href: "/dashboard/google-calendar",
    icon: CalendarDays,
  },
  {
    label: "Public Lead Page",
    href: "/dashboard/public-lead",
    icon: ExternalLink,
  },
  {
    label: "Subscription",
    href: "/dashboard/subscription",
    icon: CreditCard,
  },
];
type SidebarContentProps = {
  pathname: string;
  onNavigate?: () => void;
};

function SidebarContent({ pathname, onNavigate }: SidebarContentProps) {
  return (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-white/10 px-6">
        <Link href="/" onClick={onNavigate} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-bold text-black">
            L
          </div>

          <span className="font-semibold text-white">
            LeadFlow
            <span className="text-blue-400">AI</span>
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4">
        <p className="mb-3 px-3 text-xs font-medium uppercase tracking-wider text-zinc-600">
          Workspace
        </p>

        <nav className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;

            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  active
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

      {/* Bottom */}
      <div className="border-t border-white/10 p-4">
        <Link
          href="/dashboard/settings"
          onClick={onNavigate}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
            pathname === "/dashboard/settings"
              ? "bg-white text-black"
              : "text-zinc-500 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Settings size={18} />
          Business Settings
        </Link>

        <LogoutButton />
      </div>
    </>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);

  /*
   * Close the mobile sidebar whenever
   * navigation changes.
   */
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  /*
   * Prevent the page behind the drawer
   * from scrolling while it is open.
   */
  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  return (
    <>
      {/* =========================
          Mobile top bar
      ========================== */}
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-zinc-950/95 px-4 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-zinc-300 transition hover:bg-white/5 hover:text-white"
        >
          <Menu size={21} />
        </button>

        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-bold text-black">
            L
          </div>

          <span className="font-semibold text-white">
            LeadFlow
            <span className="text-blue-400">AI</span>
          </span>
        </Link>

        {/* Keeps logo centered */}
        <div className="h-10 w-10" aria-hidden="true" />
      </div>

      {/* =========================
          Desktop sidebar
      ========================== */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/10 bg-zinc-950 lg:flex">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* =========================
          Mobile backdrop
      ========================== */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* =========================
          Mobile drawer
      ========================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-[60] flex w-[85%] max-w-72 flex-col border-r border-white/10 bg-zinc-950 shadow-2xl transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="absolute right-3 top-3 z-10">
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-white/5 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <SidebarContent
          pathname={pathname}
          onNavigate={() => setMobileOpen(false)}
        />
      </aside>
    </>
  );
}
