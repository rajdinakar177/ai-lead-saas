import Link from "next/link";

import { siteConfig } from "@/lib/site-config";

const productLinks = [
  {
    label: "Solutions",
    href: "/#solutions",
  },
  {
    label: "How It Works",
    href: "/#how-it-works",
  },
  {
    label: "Features",
    href: "/#features",
  },
  {
    label: "Pricing",
    href: "/#pricing",
  },
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.07] bg-black">
      <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-xs font-black text-black">
                AI
              </div>

              <span className="font-semibold tracking-tight text-white">
                {siteConfig.name}
              </span>
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-6 text-zinc-600">
              AI-powered lead response, qualification and appointment workflows
              for local service businesses.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700">
              Product
            </p>

            <div className="mt-4 flex flex-col gap-3">
              {productLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-zinc-500 transition hover:text-white"
                >
                  {link.label}
                </Link>
              ))}

              <Link
                href="/demo"
                className="text-sm text-zinc-500 transition hover:text-white"
              >
                AI Demo
              </Link>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700">
              Account
            </p>

            <div className="mt-4 flex flex-col gap-3">
              <Link
                href="/login"
                className="text-sm text-zinc-500 transition hover:text-white"
              >
                Sign in
              </Link>

              <Link
                href="/register"
                className="text-sm text-zinc-500 transition hover:text-white"
              >
                Create account
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/[0.07] pt-6 text-xs text-zinc-700 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>

          <p>AI-powered lead automation.</p>
        </div>
      </div>
    </footer>
  );
}