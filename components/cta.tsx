import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section id="contact" className="border-t border-white/10 py-24">
      <div className="mx-auto max-w-5xl px-5 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] px-6 py-16 text-center sm:px-12">
          <div className="absolute left-1/2 top-0 -z-10 h-64 w-96 -translate-x-1/2 rounded-full bg-violet-600/20 blur-[100px]" />

          <p className="text-sm font-medium uppercase tracking-widest text-blue-400">
            Ready to grow?
          </p>

          <h2 className="mx-auto mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Stop letting good leads go cold.
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-zinc-400">
            See how AI-powered lead follow-up can help your business respond
            faster and book more appointments.
          </p>

          <a
            href="mailto:hello@example.com"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 font-medium text-black transition hover:bg-zinc-200"
          >
            Book a Free Demo
            <ArrowRight size={18} />
          </a>
        </div>
      </div>
    </section>
  );
}