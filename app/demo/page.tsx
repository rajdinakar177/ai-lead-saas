import { DemoChat } from "@/components/demo/demo-chat";

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[#050505] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-400">
            Interactive Demo
          </p>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            See how AI converts a lead.
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
            Pretend you're a homeowner looking for roofing or HVAC service. Watch how the assistant
            qualifies the lead and moves them toward an appointment.
          </p>
        </div>

        <DemoChat businessSlug="abc" businessName="ABC Home Services" />
      </div>
    </main>
  );
}
