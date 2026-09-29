import {
  Bot,
  CalendarCheck2,
  MessageSquareText,
  UserRoundPlus,
} from "lucide-react";

import { Reveal } from "@/components/shared/reveal";

const steps = [
  {
    number: "01",
    icon: UserRoundPlus,
    title: "A lead arrives",
    description:
      "A homeowner reaches out through your website or lead experience.",
  },
  {
    number: "02",
    icon: MessageSquareText,
    title: "AI responds",
    description:
      "The conversation starts immediately instead of waiting for someone to call back.",
  },
  {
    number: "03",
    icon: Bot,
    title: "The lead is qualified",
    description:
      "The assistant captures service needs, urgency, timeline and contact information.",
  },
  {
    number: "04",
    icon: CalendarCheck2,
    title: "An appointment is booked",
    description:
      "Qualified prospects can move directly toward an available appointment.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative border-t border-white/[0.07] bg-[#050505] py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal direction="up">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
              How it works
            </p>

            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
              From inquiry to appointment.
              <span className="block text-zinc-600">One connected workflow.</span>
            </h2>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-zinc-500">
              Give every lead a clear path forward while your team keeps
              visibility over the conversation.
            </p>
          </div>
        </Reveal>

        <div className="relative mt-16">
          <div className="absolute left-0 right-0 top-[39px] hidden h-px bg-gradient-to-r from-transparent via-white/15 to-transparent lg:block" />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <Reveal
                  key={step.number}
                  direction={index % 2 === 0 ? "left" : "right"}
                  delay={index * 0.08}
                >
                  <div className="landing-card group relative h-full rounded-[1.75rem] p-6">
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black text-white transition duration-300 group-hover:bg-white group-hover:text-black">
                        <Icon size={20} />
                      </div>

                      <span className="font-mono text-xs text-zinc-700">
                        {step.number}
                      </span>
                    </div>

                    <h3 className="mt-8 text-xl font-semibold tracking-tight text-white">
                      {step.title}
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-zinc-500">
                      {step.description}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}