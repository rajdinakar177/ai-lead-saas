"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Solutions", href: "/#solutions" },
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/#pricing" },
  { label: "AI Demo", href: "/demo" },
  {
    label: "Dashboard",
    href: "/dashboard",
  },
];
export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
        <a href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-bold text-black">
            L
          </div>

          <span className="text-lg font-semibold tracking-tight">
            LeadFlow<span className="text-blue-400">AI</span>
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:block">
          <a
            href="/#contact"
            className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-zinc-200"
          >
            Book a Demo
          </a>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="text-zinc-300 md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-black px-5 py-5 md:hidden">
          <nav className="flex flex-col gap-5">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-sm text-zinc-300"
              >
                {link.label}
              </a>
            ))}

            <a
              href="/#contact"
              onClick={() => setOpen(false)}
              className="rounded-full bg-white px-5 py-3 text-center text-sm font-medium text-black"
            >
              Book a Demo
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}