import { ArrowUpRight, Clock3, Home, Snowflake } from "lucide-react";

import { Reveal } from "@/components/shared/reveal";

const solutions = [
  {
    icon: Home,
    eyebrow: "Roofing",
    title: "Turn urgent homeowner inquiries into qualified opportunities.",
    description:
      "Respond to roof leaks, inspections, repairs and replacement inquiries while the homeowner is still looking for help.",
    items: [
      "Roof repair & leak inquiries",
      "Replacement leads",
      "Urgency qualification",
    ],
  },
  {
    icon: Snowflake,
    eyebrow: "HVAC",
    title: "Be there the moment heating or cooling problems happen.",
    description:
      "Help prospects move from a broken AC or heating issue toward a scheduled conversation without waiting for office hours.",
    items: [
      "AC & heating requests",
      "Installation inquiries",
      "Service scheduling",
    ],
  },
];

export function Solutions() {
  return (
    <section
      id="solutions"
      className="relative border-t border-white/[0.07] bg-black py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
              Built for local service
            </p>

            <h2 className="mt-5 max-w-xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              Speed matters when the customer needs help now.
            </h2>
          </div>

          <p className="max-w-xl text-base leading-7 text-zinc-500 lg:justify-self-end">
            Give every new inquiry an immediate path forward—from first response
            to qualification and appointment scheduling.
          </p>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          {solutions.map((solution, index) => {
            const Icon = solution.icon;

            return (
              <Reveal
                key={solution.eyebrow}
                direction={index % 2 === 0 ? "left" : "right"}
                delay={index * 0.08}
              >
                <div className="landing-card group relative h-full overflow-hidden rounded-[2rem] p-7 sm:p-9">
                  <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-white/[0.035] blur-3xl transition group-hover:bg-white/[0.06]" />

                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white text-black">
                        <Icon size={21} />
                      </div>

                      <ArrowUpRight
                        size={20}
                        className="text-zinc-700 transition duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-white"
                      />
                    </div>

                    <p className="mt-10 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      {solution.eyebrow}
                    </p>

                    <h3 className="mt-4 max-w-lg text-2xl font-semibold tracking-[-0.025em] text-white sm:text-3xl">
                      {solution.title}
                    </h3>

                    <p className="mt-4 max-w-xl leading-7 text-zinc-500">
                      {solution.description}
                    </p>

                    <div className="mt-8 flex flex-wrap gap-2">
                      {solution.items.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 text-xs text-zinc-400"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        <div className="mt-5">
          <Reveal direction="up">
            <div className="flex flex-col gap-5 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                  <Clock3 size={19} />
                </div>

                <div>
                  <p className="font-medium text-white">
                    Your website doesn&apos;t close.
                  </p>

                  <p className="mt-1 text-sm text-zinc-500">
                    Your lead response shouldn&apos;t either.
                  </p>
                </div>
              </div>

              <a
                href="/demo"
                className="text-sm font-medium text-white underline decoration-white/20 underline-offset-4 transition hover:decoration-white"
              >
                Experience the AI demo
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
