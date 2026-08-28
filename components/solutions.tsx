import { Building2, Home, Wrench } from "lucide-react";

const solutions = [
  {
    icon: Home,
    title: "Roofing",
    description:
      "Capture homeowners looking for repairs, replacements, inspections and emergency services.",
  },
  {
    icon: Wrench,
    title: "HVAC",
    description:
      "Respond instantly to heating, cooling, installation and maintenance requests.",
  },
  {
    icon: Building2,
    title: "Local Services",
    description:
      "Turn more website visitors into customers across high-value local service industries.",
  },
];

export function Solutions() {
  return (
    <section id="solutions" className="border-t border-white/10 py-24">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-blue-400">
            Built for local businesses
          </p>

          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Your leads shouldn't have to wait.
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-zinc-400">
            Give every potential customer an immediate response, no matter
            when they contact you.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {solutions.map((solution) => {
            const Icon = solution.icon;

            return (
              <div
                key={solution.title}
                className="group rounded-3xl border border-white/10 bg-white/[0.03] p-8 transition hover:-translate-y-1 hover:bg-white/[0.05]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                  <Icon size={23} />
                </div>

                <h3 className="mt-7 text-2xl font-semibold text-white">
                  {solution.title}
                </h3>

                <p className="mt-3 leading-7 text-zinc-500">
                  {solution.description}
                </p>

                <div className="mt-8 text-sm font-medium text-blue-400">
                  Learn more →
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}