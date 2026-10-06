import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

import { DemoChat } from "@/components/demo/demo-chat";
import { siteConfig } from "@/lib/site-config";

export default function DemoPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-20" />

      <div className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-full max-w-[700px] -translate-x-1/2 rounded-full bg-white/[0.025] blur-[100px]" />

      <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-xs text-zinc-400 transition hover:text-white sm:text-sm"
          >
            <ArrowLeft
              size={15}
              className="transition-transform group-hover:-translate-x-1"
            />

            Back to home
          </Link>

          <Link
            href="/"
            className="flex items-center gap-2"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[10px] font-black text-black">
              AI
            </div>

            <span className="hidden text-sm font-semibold sm:block">
              {siteConfig.name}
            </span>
          </Link>
        </header>

        <section
          aria-labelledby="demo-title"
          className="mb-5 mt-6 flex flex-col gap-3 sm:mt-7 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1
              id="demo-title"
              className="text-xl font-semibold tracking-tight sm:text-2xl"
            >
              Try the assistant
            </h1>

            <p className="mt-1 text-sm leading-6 text-zinc-400">
              Describe a roofing or HVAC problem and follow
              the conversation.
            </p>
          </div>

          <div className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs text-zinc-400">
            <Sparkles
              size={12}
              className="text-white"
            />

            Simulated US demo
          </div>
        </section>

        <DemoChat
          businessSlug="abc"
          businessName="ABC Home Services"
          demoOnly={true}
        />

        <p className="py-4 text-center text-[11px] leading-5 text-zinc-500">
          Use sample details. No real appointment or SMS
          will be created.
        </p>
      </div>
    </main>
  );
}