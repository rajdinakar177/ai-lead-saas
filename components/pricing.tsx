import { Check } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "$99",
    description: "For businesses ready to stop losing website leads.",
    features: [
      "Lead capture",
      "Lead dashboard",
      "Email notifications",
      "Basic website integration",
    ],
  },
  {
    name: "Growth",
    price: "$249",
    description: "For businesses that want automated lead conversion.",
    popular: true,
    features: [
      "Everything in Starter",
      "AI lead qualification",
      "Automated follow-up",
      "Appointment booking",
      "SMS automation",
      "Lead analytics",
    ],
  },
  {
    name: "Pro",
    price: "$499",
    description: "For businesses ready to automate their entire lead flow.",
    features: [
      "Everything in Growth",
      "Custom AI agent",
      "Advanced automation",
      "CRM integrations",
      "Priority support",
    ],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="border-t border-white/10 py-24">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-blue-400">
            Pricing
          </p>

          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Simple pricing. Powerful automation.
          </h2>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-3xl border p-8 ${
                plan.popular
                  ? "border-violet-500/50 bg-violet-500/[0.06]"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              {plan.popular && (
                <div className="absolute right-6 top-6 rounded-full bg-violet-500/15 px-3 py-1 text-xs font-medium text-violet-300">
                  Most Popular
                </div>
              )}

              <h3 className="text-xl font-semibold text-white">
                {plan.name}
              </h3>

              <p className="mt-3 min-h-12 text-sm leading-6 text-zinc-500">
                {plan.description}
              </p>

              <div className="mt-7">
                <span className="text-5xl font-semibold tracking-tight text-white">
                  {plan.price}
                </span>
                <span className="text-zinc-500"> / month</span>
              </div>

              <a
                href="#contact"
                className={`mt-8 block rounded-full px-5 py-3 text-center text-sm font-medium transition ${
                  plan.popular
                    ? "bg-white text-black hover:bg-zinc-200"
                    : "border border-white/10 text-white hover:bg-white/5"
                }`}
              >
                Get Started
              </a>

              <div className="mt-8 space-y-4">
                {plan.features.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-3 text-sm text-zinc-400"
                  >
                    <Check size={17} className="text-emerald-400" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}