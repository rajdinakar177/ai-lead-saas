import {
  ArrowRight,
  Check,
  MessageSquare,
  CalendarDays,
  Flame,
} from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 lg:pt-44 lg:pb-28">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[140px]" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 lg:grid-cols-2 lg:px-8">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            AI-powered lead conversion
          </div>

          <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
            Turn more leads into{" "}
            <span className="text-blue-400">booked jobs.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-400">
            AI-powered websites and automated follow-up that capture leads,
            qualify prospects, and help local service businesses book more
            customers.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="#contact"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 font-medium text-black transition hover:bg-zinc-200"
            >
              Book a Free Demo
              <ArrowRight size={18} />
            </a>

            <a
              href="/demo"
              className="inline-flex items-center justify-center rounded-full border border-white/10 px-6 py-3.5 font-medium text-white transition hover:bg-white/5"
            >
              Try AI Demo
            </a>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-zinc-500">
            <span className="flex items-center gap-2">
              <Check size={16} className="text-emerald-400" />
              24/7 lead response
            </span>

            <span className="flex items-center gap-2">
              <Check size={16} className="text-emerald-400" />
              Automated follow-up
            </span>

            <span className="flex items-center gap-2">
              <Check size={16} className="text-emerald-400" />
              Appointment booking
            </span>
          </div>
        </div>

        <div className="relative">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-3 shadow-2xl shadow-violet-950/30">
            <div className="rounded-2xl border border-white/10 bg-zinc-950 p-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div>
                  <p className="text-sm font-medium text-white">
                    Lead Conversion
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">Live activity</p>
                </div>

                <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-400">
                  Live
                </span>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/15 text-violet-300">
                      <Flame size={19} />
                    </div>

                    <div>
                      <p className="font-medium text-white">John Smith</p>
                      <p className="text-sm text-zinc-500">Roof replacement</p>
                    </div>
                  </div>

                  <span className="text-sm font-medium text-emerald-400">
                    HOT
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/[0.04] p-3">
                    <p className="text-xs text-zinc-500">AI Score</p>
                    <p className="mt-1 text-xl font-semibold text-white">92%</p>
                  </div>

                  <div className="rounded-xl bg-white/[0.04] p-3">
                    <p className="text-xs text-zinc-500">Opportunity</p>
                    <p className="mt-1 text-xl font-semibold text-white">
                      $4,800
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3 rounded-xl border border-white/10 p-3">
                  <MessageSquare size={18} className="text-blue-400" />
                  <div className="flex-1">
                    <p className="text-sm text-white">AI follow-up sent</p>
                    <p className="text-xs text-zinc-500">Just now</p>
                  </div>
                  <Check size={17} className="text-emerald-400" />
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-white/10 p-3">
                  <CalendarDays size={18} className="text-blue-400" />
                  <div className="flex-1">
                    <p className="text-sm text-white">Appointment booked</p>
                    <p className="text-xs text-zinc-500">Wednesday · 2:00 PM</p>
                  </div>
                  <Check size={17} className="text-emerald-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="absolute -bottom-5 -left-5 hidden rounded-2xl border border-white/10 bg-zinc-900 px-5 py-4 shadow-xl sm:block">
            <p className="text-xs text-zinc-500">Appointments this week</p>
            <p className="mt-1 text-2xl font-semibold text-white">+27</p>
          </div>
        </div>
      </div>
    </section>
  );
}
