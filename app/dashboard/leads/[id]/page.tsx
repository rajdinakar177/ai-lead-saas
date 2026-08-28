import mongoose from "mongoose";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  CalendarDays,
  Clock3,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { notFound } from "next/navigation";
import { requireBusiness } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Lead } from "@/models/Lead";
import { Message } from "@/models/Message";
import { Appointment } from "@/models/Appointment";

import { StatusBadge } from "@/components/dashboard/status-badge";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function LeadDetailsPage({
  params,
}: PageProps) {
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound();
  }

  await connectDB();
const business =
  await requireBusiness();
const lead =
  await Lead.findOne({
    _id: id,
    businessId:
      business._id,
  }).lean();
  if (!lead) {
    notFound();
  }

  const [messages, appointment] = await Promise.all([
    Message.find({
      leadId: lead._id,
    })
      .sort({
        createdAt: 1,
      })
      .lean(),

    Appointment.findOne({
      leadId: lead._id,
    })
      .sort({
        createdAt: -1,
      })
      .lean(),
  ]);

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/dashboard/leads"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to leads
        </Link>

        <div className="mt-6 flex flex-col gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                {lead.name || "Anonymous Lead"}
              </h1>

              <StatusBadge status={lead.status} />
            </div>

            <p className="mt-2 text-sm text-zinc-500">
              Lead details and conversation history
            </p>
          </div>

          <div className="text-sm text-zinc-600">
            Created{" "}
            {new Date(lead.createdAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03]">
          <div className="border-b border-white/10 p-6">
            <h2 className="font-semibold text-white">
              Conversation
            </h2>

            <p className="mt-1 text-sm text-zinc-600">
              Complete customer and AI message history.
            </p>
          </div>

          {messages.length === 0 ? (
            <div className="p-10 text-center text-sm text-zinc-600">
              No messages recorded for this lead.
            </div>
          ) : (
            <div className="space-y-5 p-6">
              {messages.map((message) => {
                const isLead =
                  message.sender === "lead";

                const isAI =
                  message.sender === "ai";

                return (
                  <div
                    key={message._id.toString()}
                    className={`flex ${
                      isLead
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`flex max-w-[85%] gap-3 ${
                        isLead
                          ? "flex-row-reverse"
                          : ""
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          isLead
                            ? "bg-white text-black"
                            : isAI
                              ? "bg-violet-500/15 text-blue-400"
                              : "bg-emerald-500/10 text-emerald-400"
                        }`}
                      >
                        {isLead ? (
                          <User size={15} />
                        ) : (
                          <Bot size={15} />
                        )}
                      </div>

                      <div>
                        <div
                          className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                            isLead
                              ? "rounded-tr-md bg-white text-black"
                              : "rounded-tl-md border border-white/10 bg-white/[0.04] text-zinc-200"
                          }`}
                        >
                          {message.content}
                        </div>

                        <p
                          className={`mt-1 text-[11px] text-zinc-700 ${
                            isLead
                              ? "text-right"
                              : ""
                          }`}
                        >
                          {new Date(
                            message.createdAt
                          ).toLocaleString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="font-semibold text-white">
              Lead Profile
            </h2>

            <div className="mt-6 space-y-5">
              <InfoRow
                label="Name"
                value={lead.name}
              />

              <InfoRow
                label="Phone"
                value={lead.phone}
                icon={Phone}
              />

              <InfoRow
                label="Email"
                value={lead.email}
                icon={Mail}
              />

              <InfoRow
                label="Industry"
                value={lead.industry}
              />

              <InfoRow
                label="Service"
                value={lead.service}
              />

              <InfoRow
                label="Urgency"
                value={lead.urgency}
              />

              <InfoRow
                label="Timeline"
                value={lead.timeline}
              />

              <InfoRow
                label="Source"
                value={lead.source}
              />
            </div>
          </div>

          {appointment && (
            <div className="rounded-3xl border border-blue-500/20 bg-violet-500/[0.04] p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                  <CalendarDays size={19} />
                </div>

                <div>
                  <p className="text-sm font-medium text-white">
                    Appointment
                  </p>

                  <p className="text-xs text-zinc-600">
                    Latest booking
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <p className="font-medium text-white">
                  {appointment.label}
                </p>

                <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                  <Clock3 size={14} />

                  {new Date(
                    appointment.scheduledFor
                  ).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>

                <span className="mt-4 inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium capitalize text-emerald-400">
                  {appointment.status}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type IconType = React.ComponentType<{
  size?: number;
}>;

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string | null;
  icon?: IconType;
}) {
  return (
    <div className="border-b border-white/5 pb-4 last:border-0 last:pb-0">
      <p className="text-xs uppercase tracking-wider text-zinc-700">
        {label}
      </p>

      <div className="mt-2 flex items-center gap-2">
        {Icon && (
          <Icon size={14} />
        )}

        <p className="text-sm text-zinc-300">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}