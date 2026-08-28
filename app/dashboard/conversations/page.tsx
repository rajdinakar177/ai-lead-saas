import Link from "next/link";
import {
  Bot,
  MessageSquareText,
  User,
} from "lucide-react";

import { connectDB } from "@/lib/mongodb";
import { requireBusiness } from "@/lib/auth";
import { Lead } from "@/models/Lead";
import { Message } from "@/models/Message";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { StatusBadge } from "@/components/dashboard/status-badge";

export const dynamic = "force-dynamic";

type LeadDocument = {
  _id: {
    toString(): string;
  };
  name?: string;
  phone?: string;
  service?: string;
  status: string;
  createdAt: Date;
};

type MessageDocument = {
  _id: {
    toString(): string;
  };
  leadId: {
    toString(): string;
  };
  sender: "lead" | "ai" | "business";
  content: string;
  createdAt: Date;
};

export default async function ConversationsPage() {
  await connectDB();
const business =
  await requireBusiness();

  if (!business) {
    return <div>Business not found.</div>;
  }

  const leads = (await Lead.find({
    businessId: business._id,
  })
    .sort({
      updatedAt: -1,
    })
    .lean()) as unknown as LeadDocument[];

  const conversations = await Promise.all(
    leads.map(async (lead) => {
      const messages = (await Message.find({
        leadId: lead._id,
      })
        .sort({
          createdAt: -1,
        })
        .limit(2)
        .lean()) as unknown as MessageDocument[];

      return {
        lead,
        latestMessage: messages[0] ?? null,
        previousMessage: messages[1] ?? null,
      };
    })
  );

  const visibleConversations = conversations.filter(
    (conversation) => conversation.latestMessage
  );

  return (
    <div>
      <DashboardHeader
        title="Conversations"
        description="Review recent conversations handled by your AI assistant."
      />

      <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03]">
        <div className="flex items-center justify-between border-b border-white/10 p-6">
          <div>
            <h2 className="font-semibold text-white">
              Inbox
            </h2>

            <p className="mt-1 text-sm text-zinc-600">
              {visibleConversations.length} conversations
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
            <MessageSquareText size={19} />
          </div>
        </div>

        {visibleConversations.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquareText
              size={28}
              className="mx-auto text-zinc-700"
            />

            <p className="mt-4 text-sm text-zinc-600">
              No conversations yet.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {visibleConversations.map(
              ({
                lead,
                latestMessage,
                previousMessage,
              }) => {
                if (!latestMessage) {
                  return null;
                }

                return (
                  <Link
                    key={lead._id.toString()}
                    href={`/dashboard/leads/${lead._id.toString()}`}
                    className="block p-6 transition hover:bg-white/[0.025]"
                  >
                    <div className="flex gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-sm font-medium text-violet-300">
                        {getInitials(
                          lead.name || "Anonymous"
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-center gap-3">
                            <p className="truncate font-medium text-white">
                              {lead.name ||
                                "Anonymous Lead"}
                            </p>

                            <StatusBadge
                              status={lead.status}
                            />
                          </div>

                          <p className="shrink-0 text-xs text-zinc-700">
                            {formatMessageDate(
                              latestMessage.createdAt
                            )}
                          </p>
                        </div>

                        <p className="mt-1 text-sm text-zinc-600">
                          {lead.service ||
                            "Service not identified yet"}
                        </p>

                        <div className="mt-4 space-y-2">
                          {previousMessage && (
                            <MessagePreview
                              message={previousMessage}
                            />
                          )}

                          <MessagePreview
                            message={latestMessage}
                            latest
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              }
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MessagePreview({
  message,
  latest = false,
}: {
  message: MessageDocument;
  latest?: boolean;
}) {
  const isLead =
    message.sender === "lead";

  const isAI =
    message.sender === "ai";

  return (
    <div
      className={`flex items-center gap-2 text-sm ${
        latest
          ? "text-zinc-300"
          : "text-zinc-600"
      }`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          isLead
            ? "bg-white/10 text-zinc-300"
            : isAI
              ? "bg-blue-500/10 text-blue-400"
              : "bg-emerald-500/10 text-emerald-400"
        }`}
      >
        {isLead ? (
          <User size={12} />
        ) : (
          <Bot size={12} />
        )}
      </span>

      <span className="shrink-0 text-xs text-zinc-700">
        {isLead
          ? "Lead:"
          : isAI
            ? "AI:"
            : "Business:"}
      </span>

      <span className="truncate">
        {message.content}
      </span>
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatMessageDate(date: Date) {
  const value = new Date(date);

  return value.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}