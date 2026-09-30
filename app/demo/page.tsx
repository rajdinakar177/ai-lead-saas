import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

import { DemoChat } from "@/components/demo/demo-chat";
import { siteConfig } from "@/lib/site-config";

export default function DemoPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-30" />

      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-white/[0.035] blur-[130px]" />

      <div className="relative mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-white"
          >
            <ArrowLeft
              size={16}
              className="transition-transform group-hover:-translate-x-1"
            />
            Back to home
          </Link>

          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[10px] font-black text-black">
              AI
            </div>

            <span className="hidden text-sm font-semibold text-white sm:block">
              {siteConfig.name}
            </span>
          </Link>
        </header>

        <section className="pb-8 pt-14 text-center sm:pb-12 sm:pt-20">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-2 text-xs font-medium text-zinc-400">
            <Sparkles size={13} className="text-white" />
            Interactive AI experience
          </div>

          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl lg:text-6xl">
            Experience the conversation
            <span className="block text-zinc-600">your leads could have.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-zinc-500 sm:text-base">
            Play the role of a homeowner looking for roofing or HVAC help.
            Watch the assistant qualify the request and move the conversation
            toward an available appointment.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {[
              "Try: My roof is leaking",
              "Try: My AC stopped cooling",
              "Try: I need a roof replacement",
            ].map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/[0.07] bg-black/40 px-3 py-1.5 text-[11px] text-zinc-600"
              >
                {item}
              </span>
            ))}
          </div>
        </section>

        <DemoChat businessSlug="abc" businessName="ABC Home Services" />

        <div className="py-10 text-center">
          <p className="text-xs text-zinc-700">
            This demo uses a sample service business to demonstrate the lead
            qualification experience.
          </p>
        </div>
      </div>
    </main>
  );
}