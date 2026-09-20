import { Bot, CalendarCheck, MessageCircle, UserPlus } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Capture",
    description:
      "Capture every lead from your website with a fast, conversion-focused form.",
  },
  {
    number: "02",
    icon: Bot,
    title: "Qualify",
    description:
      "AI instantly asks the right questions and identifies your hottest prospects.",
  },
  {
    number: "03",
    icon: MessageCircle,
    title: "Follow Up",
    description:
      "Automatically respond and follow up with leads so opportunities don't go cold.",
  },
  {
    number: "04",
    icon: CalendarCheck,
    title: "Book",
    description:
      "Qualified prospects can schedule an appointment directly with your business.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-white/10 py-24">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-widest text-blue-400">
            How it works
          </p>

          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            From new lead to booked appointment automatically.
          </h2>

          <p className="mt-5 text-lg leading-8 text-zinc-400">
            Stop losing potential customers because nobody responded fast
            enough.
          </p>
        </div>

        <div className="mt-16 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <div
                key={step.number}
                className="bg-zinc-950 p-7 transition hover:bg-zinc-900"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-blue-400">
                    <Icon size={21} />
                  </div>

                  <span className="text-sm text-zinc-600">{step.number}</span>
                </div>

                <h3 className="mt-7 text-xl font-semibold text-white">
                  {step.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-zinc-500">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
