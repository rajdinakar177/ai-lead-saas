import {
  Bot,
  CalendarDays,
  ChartNoAxesCombined,
  Clock3,
  MessageSquareMore,
  RefreshCw,
} from "lucide-react";

import { Reveal } from "@/components/shared/reveal";

const features = [
  {
    icon: Bot,
    title: "AI qualification",
    description:
      "Capture service, urgency, timeline, name and contact details through a natural conversation.",
  },
  {
    icon: MessageSquareMore,
    title: "SMS conversations",
    description:
      "Continue lead conversations through text while keeping activity organized with the lead.",
  },
  {
    icon: CalendarDays,
    title: "Appointment booking",
    description:
      "Present available times and move qualified prospects toward a scheduled appointment.",
  },
  {
    icon: RefreshCw,
    title: "Automated follow-up",
    description:
      "Keep eligible leads moving with automated follow-up instead of relying entirely on manual outreach.",
  },
  {
    icon: Clock3,
    title: "24/7 response",
    description:
      "Give new website inquiries an immediate response even when your team is unavailable.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Lead visibility",
    description:
      "Track leads, conversations, appointments and activity from one business dashboard.",
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="signal-field relative border-t border-white/[0.07] bg-black py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal direction="left">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
              The platform
            </p>

            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
              Built around the moments
              <span className="block text-zinc-600">that turn leads into jobs.</span>
            </h2>
          </div>
        </Reveal>

        <div className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <Reveal
                key={feature.title}
                direction={index % 2 === 0 ? "left" : "right"}
                delay={(index % 3) * 0.07}
              >
                <div className="landing-card group h-full rounded-[1.75rem] p-7 transition duration-500 hover:-translate-y-1">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-white transition duration-300 group-hover:bg-white group-hover:text-black">
                    <Icon size={19} />
                  </div>

                  <h3 className="mt-8 text-xl font-semibold tracking-tight text-white">
                    {feature.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-zinc-500">
                    {feature.description}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal direction="up">
          <div className="mt-16 overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#080808]">
            <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
              <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-12">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-600">
                  One workspace
                </p>

                <h3 className="mt-5 text-3xl font-semibold tracking-[-0.035em] text-white">
                  Know what is happening with every opportunity.
                </h3>

                <p className="mt-4 max-w-lg leading-7 text-zinc-500">
                  Lead status, qualification details, conversations and
                  appointments stay connected instead of being scattered across
                  different tools.
                </p>
              </div>

              <div className="border-t border-white/[0.07] bg-black p-5 lg:border-l lg:border-t-0 sm:p-7">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                  <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-white/[0.07] px-4 py-3 text-xs text-zinc-600">
                    <span>Lead</span>
                    <span>Status</span>
                  </div>

                  {[
                    ["Emergency roof leak", "HOT"],
                    ["AC not cooling", "QUALIFIED"],
                    ["Roof replacement", "BOOKED"],
                  ].map(([lead, status]) => (
                    <div
                      key={lead}
                      className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-white/[0.05] px-4 py-4 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-200">
                          {lead}
                        </p>

                        <p className="mt-1 text-xs text-zinc-700">
                          Website conversation
                        </p>
                      </div>

                      <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-zinc-400">
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}