"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  CreditCard,
  LayoutDashboard,
  Menu,
  ReceiptText,
  ServerCog,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AdminLogoutButton } from "@/components/admin/admin-logout-button";

const navigation = [
  {
    label: "Overview",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Businesses",
    href: "/admin/businesses",
    icon: Building2,
  },
  {
    label: "Subscriptions",
    href: "/admin/subscriptions",
    icon: CreditCard,
  },
  {
    label: "Payments",
    href: "/admin/payments",
    icon: ReceiptText,
  },
  {
    label: "System",
    href: "/admin/system",
    icon: ServerCog,
  },
];

type AdminSidebarContentProps = {
  pathname: string;
  onNavigate?: () => void;
};

function AdminSidebarContent({ pathname, onNavigate }: AdminSidebarContentProps) {
  return (
    <>
      <div className="flex h-16 items-center border-b border-white/10 px-6">
        <Link href="/admin" onClick={onNavigate} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black">
            <ShieldCheck size={17} />
          </div>

          <span className="font-semibold text-white">Administration</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <p className="mb-3 px-3 text-xs font-medium uppercase tracking-wider text-zinc-600">
          Platform
        </p>

        <nav className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;

            const active =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));

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

      <div className="border-t border-white/10 p-4">
        <AdminLogoutButton />
      </div>
    </>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-zinc-950/95 px-4 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open administration menu"
          aria-expanded={mobileOpen}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-zinc-300 transition hover:bg-white/5 hover:text-white"
        >
          <Menu size={21} />
        </button>

        <Link href="/admin" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black">
            <ShieldCheck size={17} />
          </div>

          <span className="font-semibold text-white">Administration</span>
        </Link>

        <div className="h-10 w-10" aria-hidden="true" />
      </div>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/10 bg-zinc-950 lg:flex">
        <AdminSidebarContent pathname={pathname} />
      </aside>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close administration menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-[60] flex w-[85%] max-w-72 flex-col border-r border-white/10 bg-zinc-950 shadow-2xl transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="absolute right-3 top-3 z-10">
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close administration menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-white/5 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <AdminSidebarContent pathname={pathname} onNavigate={() => setMobileOpen(false)} />
      </aside>
    </>
  );
}