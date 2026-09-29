import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export function CTA() {
  return (
    <section
      id="contact"
      className="relative overflow-hidden border-t border-white/[0.07] bg-black py-24 sm:py-32"
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[450px] w-[750px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.04] blur-[130px]" />

      <div className="relative mx-auto max-w-6xl px-5 lg:px-8">
        <div className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-white px-6 py-16 text-center text-black sm:px-12 sm:py-20">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white">
            <Sparkles size={19} />
          </div>

          <h2 className="mx-auto mt-7 max-w-3xl text-4xl font-semibold tracking-[-0.05em] sm:text-5xl lg:text-6xl">
            Every new lead deserves an immediate response.
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
            Give your roofing or HVAC business a faster path from website
            inquiry to qualified prospect and booked appointment.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-black px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Get started
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>

            <Link
              href="/demo"
              className="inline-flex items-center justify-center rounded-xl border border-black/10 px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-black/[0.04]"
            >
              Try the AI demo
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}