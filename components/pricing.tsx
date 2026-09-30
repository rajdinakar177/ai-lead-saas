import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { formatMonthlyPrice } from "@/lib/plan-pricing";
import { Reveal } from "@/components/shared/reveal";

const plans = [
  {
    name: "Starter",
    price: formatMonthlyPrice("starter"),
    description:
      "Core lead capture, AI conversations and appointment tools for growing service businesses.",
    features: [
      "Up to 250 leads / month",
      "250 AI conversations",
      "500 SMS segments",
      "100 appointments",
      "Lead & conversation dashboard",
      "AI lead qualification",
    ],
  },
  {
    name: "Pro",
    price: formatMonthlyPrice("pro"),
    description:
      "Higher usage plus automation and calendar tools for businesses ready to scale.",
    featured: true,
    features: [
      "Up to 1,000 leads / month",
      "1,000 AI conversations",
      "2,000 SMS segments",
      "500 appointments",
      "Automated follow-ups",
      "Google Calendar integration",
    ],
  },
];

export function Pricing() {
  return (
    <section
      id="pricing"
      className="relative border-t border-white/[0.07] bg-[#050505] py-24 sm:py-32"
    >
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <Reveal direction="up">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
              Pricing
            </p>

            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              Start simple. Scale when you&apos;re ready.
            </h2>

            <p className="mx-auto mt-5 max-w-xl leading-7 text-zinc-500">
              Two straightforward plans built around real lead, conversation,
              SMS and appointment usage.
            </p>
          </div>
        </Reveal>

        <div className="mx-auto mt-14 grid max-w-4xl gap-5 lg:grid-cols-2">
          {plans.map((plan, index) => (
            <Reveal
              key={plan.name}
              direction={index === 0 ? "left" : "right"}
              delay={index * 0.08}
            >
              <div
                className={`relative h-full overflow-hidden rounded-[2rem] border p-7 sm:p-9 ${
                  plan.featured
                    ? "border-white/25 bg-white text-black"
                    : "border-white/[0.09] bg-black text-white"
                }`}
              >
                {plan.featured ? (
                  <div className="absolute right-6 top-6 rounded-full bg-black px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-white">
                    Most popular
                  </div>
                ) : null}

                <p
                  className={`text-sm font-semibold ${
                    plan.featured ? "text-zinc-700" : "text-zinc-400"
                  }`}
                >
                  {plan.name}
                </p>

                <div className="mt-6 flex items-end gap-2">
                  <span className="text-5xl font-semibold tracking-[-0.05em]">
                    {plan.price}
                  </span>

                  <span
                    className={`pb-1 text-sm ${
                      plan.featured ? "text-zinc-500" : "text-zinc-600"
                    }`}
                  >
                    / month
                  </span>
                </div>

                <p
                  className={`mt-5 min-h-14 text-sm leading-6 ${
                    plan.featured ? "text-zinc-600" : "text-zinc-500"
                  }`}
                >
                  {plan.description}
                </p>

                <Link
                  href={`/register?plan=${plan.name.toLowerCase()}`}
                  className={`group mt-8 flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold transition ${
                    plan.featured
                      ? "bg-black text-white hover:bg-zinc-800"
                      : "bg-white text-black hover:bg-zinc-200"
                  }`}
                >
                  Get started
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>

                <div
                  className={`my-8 h-px ${
                    plan.featured ? "bg-black/10" : "bg-white/[0.08]"
                  }`}
                />

                <div className="space-y-4">
                  {plan.features.map((feature) => (
                    <div
                      key={feature}
                      className={`flex items-start gap-3 text-sm ${
                        plan.featured ? "text-zinc-700" : "text-zinc-400"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                          plan.featured
                            ? "bg-black text-white"
                            : "border border-white/10 bg-white/[0.04] text-white"
                        }`}
                      >
                        <Check size={11} />
                      </span>

                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <p className="mt-7 text-center text-xs leading-5 text-zinc-700">
          Usage limits reset with the applicable subscription billing period.
          SMS delivery and integrations require supported configuration.
        </p>
      </div>
    </section>
  );
}