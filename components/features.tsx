import {
  BrainCircuit,
  ChartNoAxesCombined,
  Clock3,
  MessagesSquare,
  MousePointerClick,
  ShieldCheck,
} from "lucide-react";

const features = [
  {
    icon: BrainCircuit,
    title: "AI Lead Qualification",
    description:
      "Automatically understand what each lead needs and identify high-value opportunities.",
  },
  {
    icon: MessagesSquare,
    title: "Automated Follow-Up",
    description:
      "Keep conversations moving with timely, personalized follow-ups.",
  },
  {
    icon: Clock3,
    title: "24/7 Response",
    description:
      "Respond to new inquiries instantly, even outside business hours.",
  },
  {
    icon: MousePointerClick,
    title: "Appointment Booking",
    description:
      "Let qualified prospects choose a convenient appointment time.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Lead Analytics",
    description:
      "See where your leads come from and how many turn into appointments.",
  },
  {
    icon: ShieldCheck,
    title: "Built for Business",
    description:
      "Keep your customer conversations and lead data organized in one place.",
  },
];

export function Features() {
  return (
    <section id="features" className="border-t border-white/10 py-24">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-widest text-blue-400">
            Features
          </p>

          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Everything you need to convert more leads.
          </h2>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div key={feature.title} className="bg-zinc-950 p-8">
                <Icon size={23} className="text-blue-400" />

                <h3 className="mt-6 font-semibold text-white">
                  {feature.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-zinc-500">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
