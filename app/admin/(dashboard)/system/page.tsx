import {
  Building2,
  CalendarDays,
  Database,
  MessageSquareText,
  ServerCog,
  Users,
} from "lucide-react";

import { connectDB } from "@/lib/mongodb";
import { Appointment } from "@/models/Appointment";
import { Business } from "@/models/Business";
import { Lead } from "@/models/Lead";
import { Message } from "@/models/Message";

export default async function AdminSystemPage() {
  await connectDB();

  const [businesses, leads, appointments, messages] = await Promise.all([
    Business.countDocuments(),
    Lead.countDocuments(),
    Appointment.countDocuments(),
    Message.countDocuments(),
  ]);

  const metrics = [
    {
      label: "Businesses",
      value: businesses,
      icon: Building2,
    },
    {
      label: "Leads",
      value: leads,
      icon: Users,
    },
    {
      label: "Appointments",
      value: appointments,
      icon: CalendarDays,
    },
    {
      label: "Messages",
      value: messages,
      icon: MessageSquareText,
    },
  ];

  return (
    <>
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-blue-400">
          Platform
        </p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          System
        </h1>

        <p className="mt-2 text-zinc-500">
          Monitor platform data and integration readiness.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <div
              key={metric.label}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-zinc-500">{metric.label}</p>

                  <p className="mt-3 text-3xl font-semibold tracking-tight">
                    {metric.value.toLocaleString()}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-zinc-400">
                  <Icon size={19} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center gap-2">
            <Database size={18} className="text-zinc-500" />

            <h2 className="font-semibold">Database</h2>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <span className="text-sm text-zinc-500">MongoDB</span>

            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
              Connected
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center gap-2">
            <ServerCog size={18} className="text-zinc-500" />

            <h2 className="font-semibold">Usage Tracking</h2>
          </div>

          <p className="mt-5 text-sm leading-6 text-zinc-500">
            Detailed AI token usage, SMS usage, provider costs and integration
            health will be added when production providers are enabled.
          </p>
        </div>
      </div>
    </>
  );
}