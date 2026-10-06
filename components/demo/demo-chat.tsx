"use client";

import {
  DEMO_WELCOME,
  DEMO_SERVICE_OPTIONS,
  getLocalDemoReply,
  getLocalDemoSlots,
} from "@/lib/demo/local-demo";

import {
  Bot,
  CalendarDays,
  Check,
  CircleDot,
  Flame,
  LoaderCircle,
  MapPin,
  RefreshCcw,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import { DemoRegistrationPopup } from "@/components/demo/demo-registration-popup";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type Message = {
  id: string;
  sender: "ai" | "user";
  text: string;
};

type LeadData = {
  industry?: string;
  service?: string;
  location?: string;

  state?: string;
  stateCode?: string;
  address?: string;

  city?: string;
  cityVerified?: boolean;

  zipCode?: string;
  zipVerified?: boolean;

  urgency?: string;
  timeline?: string;
  name?: string;
  phone?: string;
  appointment?: string;
};

type LeadStatus = "new" | "warm" | "hot";

type ChatOption = {
  label: string;
  value: string;
};

type AppointmentSlot = {
  label: string;
  scheduledFor: string;
};

type ApiLead = {
  id?: string | null;
  status?: string | null;

  industry?: string | null;
  service?: string | null;
  location?: string | null;
  urgency?: string | null;
  timeline?: string | null;
  name?: string | null;
  phone?: string | null;
  appointment?: string | null;
};

type LeadApiResponse = {
  error?: string;
  lead: ApiLead;
  messages?: Message[];
  options?: ChatOption[];
  completed?: boolean;
};

type ChatApiResponse = {
  reply: string;
  error?: string;
  code?: string;

  leadId?: string | null;
  publicAccessToken?: string | null;
  conversationToken?: string | null;

  lead: ApiLead;
  status: LeadStatus;
  readyToBook: boolean;

  options?: ChatOption[];
  messageId?: string | null;
};

type DemoChatProps = {
  businessSlug: string;
  businessName: string;
  compact?: boolean;
  demoOnly?: boolean;
};

function normalizeStatus(status?: string | null): LeadStatus {
  if (
    status === "hot" ||
    status === "qualified" ||
    status === "booked"
  ) {
    return "hot";
  }

  return status === "warm" ? "warm" : "new";
}

function toLeadData(lead: ApiLead): LeadData {
  return {
    industry: lead.industry ?? undefined,
    service: lead.service ?? undefined,
    location: lead.location ?? undefined,
    urgency: lead.urgency ?? undefined,
    timeline: lead.timeline ?? undefined,
    name: lead.name ?? undefined,
    phone: lead.phone ?? undefined,
    appointment: lead.appointment ?? undefined,
  };
}

export function DemoChat({
  businessSlug,
  businessName,
  compact = false,
  demoOnly = false,
}: DemoChatProps) {
  const reduceMotion = useReducedMotion();

  const [leadId, setLeadId] = useState<string | null>(null);

  const [publicAccessToken, setPublicAccessToken] =
    useState<string | null>(null);

  const [conversationToken, setConversationToken] =
    useState<string | null>(null);

  const [initializing, setInitializing] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [options, setOptions] = useState<ChatOption[]>([]);

  const [lead, setLead] = useState<LeadData>({});
  const [status, setStatus] = useState<LeadStatus>("new");

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [readyToBook, setReadyToBook] = useState(false);
  const [completed, setCompleted] = useState(false);

  const [appointmentSlots, setAppointmentSlots] =
    useState<AppointmentSlot[]>([]);

  const [loadingSlots, setLoadingSlots] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);

  const resetLocalDemo = useCallback(() => {
    setLeadId(null);
    setPublicAccessToken(null);
    setConversationToken(null);

    setMessages([
      {
        id: crypto.randomUUID(),
        sender: "ai",
        text: DEMO_WELCOME,
      },
    ]);

    setLead({});
    setStatus("new");
    setInput("");
    setOptions(DEMO_SERVICE_OPTIONS);

    setAppointmentSlots([]);
    setReadyToBook(false);
    setCompleted(false);

    setError(null);
    setLoading(false);
    setLoadingSlots(false);
    setInitializing(false);
  }, []);

  const loadAvailability = useCallback(
    async (
      timeline: string,
      currentLeadId: string,
      accessToken: string,
    ) => {
      if (demoOnly) {
        setAppointmentSlots(getLocalDemoSlots());
        return;
      }

      if (!timeline || !currentLeadId || !accessToken) {
        setAppointmentSlots([]);
        return;
      }

      try {
        setLoadingSlots(true);

        const response = await fetch(
          `/api/availability?leadId=${encodeURIComponent(
            currentLeadId,
          )}&timeline=${encodeURIComponent(timeline)}`,
          {
            cache: "no-store",
            headers: {
              "X-Lead-Access-Token": accessToken,
            },
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Unable to load availability.",
          );
        }

        setAppointmentSlots(data.slots ?? []);
      } catch (error) {
        console.error("Availability error:", error);

        setAppointmentSlots([]);

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load available appointments.",
        );
      } finally {
        setLoadingSlots(false);
      }
    },
    [demoOnly],
  );

  const startAnonymousChat = useCallback(async () => {
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        businessSlug,
      }),
      cache: "no-store",
    });

    const data: LeadApiResponse = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Unable to initialize conversation.",
      );
    }

    setLeadId(data.lead.id ?? null);
    setPublicAccessToken(null);

    setMessages(data.messages ?? []);
    setLead(toLeadData(data.lead));
    setOptions(data.options ?? []);

    setAppointmentSlots([]);
    setStatus("new");
    setReadyToBook(false);
    setCompleted(false);
  }, [businessSlug]);

  useEffect(() => {
    if (demoOnly) {
      resetLocalDemo();
      return;
    }

    async function initializeChat() {
      try {
        setInitializing(true);
        setError(null);
        setInput("");

        setLeadId(null);
        setPublicAccessToken(null);
        setConversationToken(null);

        setMessages([]);
        setOptions([]);
        setLead({});
        setStatus("new");

        setAppointmentSlots([]);
        setReadyToBook(false);
        setCompleted(false);

        const storageKey =
          `leadflow:${businessSlug}:leadId`;

        const accessTokenKey =
          `leadflow:${businessSlug}:publicAccessToken`;

        const conversationTokenKey =
          `leadflow:${businessSlug}:conversationToken`;

        const storedLeadId =
          localStorage.getItem(storageKey);

        const storedAccessToken =
          localStorage.getItem(accessTokenKey);

        const storedConversationToken =
          localStorage.getItem(conversationTokenKey);

        setConversationToken(storedConversationToken);

        if (storedLeadId && storedAccessToken) {
          const response = await fetch(
            `/api/leads/${encodeURIComponent(storedLeadId)}`,
            {
              cache: "no-store",
              headers: {
                "X-Lead-Access-Token": storedAccessToken,
              },
            },
          );

          if (response.ok) {
            const data: LeadApiResponse =
              await response.json();

            const restoredLeadId =
              data.lead.id ?? storedLeadId;

            const isCompleted =
              Boolean(data.completed);

            const canBook =
              data.lead.status === "qualified" &&
              !isCompleted;

            setLeadId(restoredLeadId);
            setPublicAccessToken(storedAccessToken);

            setMessages(data.messages ?? []);
            setLead(toLeadData(data.lead));
            setStatus(normalizeStatus(data.lead.status));

            setCompleted(isCompleted);
            setReadyToBook(canBook);
            setOptions([]);

            if (canBook && data.lead.timeline) {
              await loadAvailability(
                data.lead.timeline,
                restoredLeadId,
                storedAccessToken,
              );
            }

            return;
          }

          localStorage.removeItem(storageKey);
          localStorage.removeItem(accessTokenKey);
        } else if (storedLeadId || storedAccessToken) {
          localStorage.removeItem(storageKey);
          localStorage.removeItem(accessTokenKey);
        }

        await startAnonymousChat();
      } catch (error) {
        console.error("Chat initialization error:", error);

        setError(
          error instanceof Error
            ? error.message
            : "Unable to initialize conversation.",
        );
      } finally {
        setInitializing(false);
      }
    }

    void initializeChat();
  }, [
    businessSlug,
    demoOnly,
    resetLocalDemo,
    loadAvailability,
    startAnonymousChat,
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [
    messages,
    loading,
    options,
    appointmentSlots,
    loadingSlots,
    reduceMotion,
  ]);

  async function sendMessage(messageText?: string) {
    const text = (messageText ?? input).trim();

    if (
      !text ||
      busyRef.current ||
      loading ||
      initializing ||
      completed
    ) {
      return;
    }

    busyRef.current = true;

    setError(null);
    setOptions([]);
    setInput("");
    setLoading(true);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      sender: "user",
      text,
    };

    const updatedMessages = [
      ...messages,
      userMessage,
    ];

    setMessages(updatedMessages);

    try {
      // Simulated public demo.
      // Only ZIP lookup can make an external request.
      if (demoOnly) {
        const result = await getLocalDemoReply(
          text.slice(0, 500),
          lead,
        );

        setLead(result.lead);
        setStatus(result.status);
        setOptions(result.options);
        setReadyToBook(result.readyToBook);

        setAppointmentSlots(
          result.readyToBook
            ? getLocalDemoSlots()
            : [],
        );

        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            sender: "ai",
            text: result.reply,
          },
        ]);

        return;
      }

      // Real business chat.
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadId,
          publicAccessToken,
          conversationToken,
          businessSlug,
          messages: updatedMessages,
          lead,
        }),
      });

      const data: ChatApiResponse =
        await response.json();

      if (!response.ok) {
        setError(
          data.error ||
          data.reply ||
          "Unable to send message.",
        );

        return;
      }

      if (data.conversationToken) {
        setConversationToken(data.conversationToken);

        localStorage.setItem(
          `leadflow:${businessSlug}:conversationToken`,
          data.conversationToken,
        );
      }

      if (data.leadId && data.publicAccessToken) {
        setLeadId(data.leadId);
        setPublicAccessToken(data.publicAccessToken);

        localStorage.setItem(
          `leadflow:${businessSlug}:leadId`,
          data.leadId,
        );

        localStorage.setItem(
          `leadflow:${businessSlug}:publicAccessToken`,
          data.publicAccessToken,
        );
      }

      setLead({
        ...toLeadData(data.lead),
        appointment:
          data.lead.appointment ??
          lead.appointment,
      });

      setStatus(data.status);
      setOptions(data.options ?? []);
      setReadyToBook(data.readyToBook);

      setMessages((current) => [
        ...current,
        {
          id: data.messageId || crypto.randomUUID(),
          sender: "ai",
          text: data.reply,
        },
      ]);

      const currentLeadId =
        data.leadId ?? leadId;

      const currentAccessToken =
        data.publicAccessToken ?? publicAccessToken;

      if (
        data.readyToBook &&
        data.lead.timeline &&
        currentLeadId &&
        currentAccessToken
      ) {
        await loadAvailability(
          data.lead.timeline,
          currentLeadId,
          currentAccessToken,
        );
      } else {
        setAppointmentSlots([]);
      }
    } catch (error) {
      console.error("Send message error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong.",
      );
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    void sendMessage();
  }

  async function chooseAppointment(
    slot: AppointmentSlot,
  ) {
    if (
      busyRef.current ||
      loading ||
      initializing ||
      completed ||
      !readyToBook
    ) {
      return;
    }

    if (demoOnly) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          sender: "user",
          text: slot.label,
        },
        {
          id: crypto.randomUUID(),
          sender: "ai",
          text:
            `Thanks, ${lead.name ?? "there"}! ` +
            "You've completed the demo. " +
            "This was a simulated booking; " +
            "no real appointment or SMS was created.",
        },
      ]);

      setLead((current) => ({
        ...current,
        appointment: slot.label,
      }));

      setAppointmentSlots([]);
      setOptions([]);
      setCompleted(true);
      setReadyToBook(false);
      setStatus("hot");

      return;
    }

    if (!leadId || !publicAccessToken) {
      return;
    }

    busyRef.current = true;

    try {
      setLoading(true);
      setError(null);
      setOptions([]);

      const response = await fetch(
        "/api/appointments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            leadId,
            publicAccessToken,
            appointment: slot.label,
            scheduledFor: slot.scheduledFor,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error || "Unable to save appointment.",
        );

        return;
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          sender: "user",
          text: slot.label,
        },
        {
          id: data.messageId || crypto.randomUUID(),
          sender: "ai",
          text: data.confirmation,
        },
      ]);

      setLead((current) => ({
        ...current,
        appointment: slot.label,
      }));

      setAppointmentSlots([]);
      setCompleted(true);
      setReadyToBook(false);
      setStatus("hot");
    } catch (error) {
      console.error("Appointment error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to save appointment.",
      );
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }

  async function restartDemo() {
    if (
      busyRef.current ||
      loading ||
      initializing
    ) {
      return;
    }

    if (demoOnly) {
      resetLocalDemo();
      return;
    }

    busyRef.current = true;

    try {
      setInitializing(true);
      setError(null);
      setInput("");

      setOptions([]);
      setAppointmentSlots([]);
      setLoadingSlots(false);

      localStorage.removeItem(
        `leadflow:${businessSlug}:leadId`,
      );

      localStorage.removeItem(
        `leadflow:${businessSlug}:publicAccessToken`,
      );

      localStorage.removeItem(
        `leadflow:${businessSlug}:conversationToken`,
      );

      setLeadId(null);
      setPublicAccessToken(null);
      setConversationToken(null);

      await startAnonymousChat();
    } catch (error) {
      console.error("Restart error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to restart conversation.",
      );
    } finally {
      busyRef.current = false;
      setInitializing(false);
      setLoading(false);
    }
  }

  if (initializing) {
    return (
      <div className="flex min-h-[600px] items-center justify-center overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#080808]">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <LoaderCircle
              size={19}
              className="animate-spin text-white"
            />
          </div>

          <p className="mt-4 text-sm font-medium text-zinc-300">
            {demoOnly
              ? "Starting simulated conversation"
              : "Starting AI conversation"}
          </p>

          <p className="mt-1 text-xs text-zinc-600">
            Preparing the chat experience...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        compact
          ? "w-full"
          : "grid items-start gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)]"
      }
    >
      <motion.section
        initial={
          reduceMotion
            ? false
            : { opacity: 0, y: 30 }
        }
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.65,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="overflow-hidden rounded-[2rem] border border-white/[0.09] bg-[#080808] shadow-[0_30px_100px_rgba(0,0,0,0.45)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-black">
              <Bot size={19} />

              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[3px] border-[#080808] bg-white" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white sm:text-base">
                {businessName}
              </p>

              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-500 sm:text-xs">
                <Sparkles
                  size={11}
                  className="shrink-0"
                />

                <span>
                  {demoOnly
                    ? "US service demo · Simulated"
                    : "AI lead assistant"}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void restartDemo()}
            disabled={loading || initializing}
            aria-label="Restart conversation"
            className="group flex h-9 shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 text-xs text-zinc-500 transition hover:border-white/15 hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCcw
              size={13}
              className="transition-transform duration-500 group-hover:rotate-180"
            />

            <span className="hidden sm:inline">
              Restart
            </span>
          </button>
        </div>

        {/* Conversation */}
        <div
          role="log"
          aria-label="Conversation"
          aria-live="polite"
          className={`demo-chat-scroll overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 ${compact
            ? "h-[360px]"
            : "h-[clamp(220px,calc(100dvh_-_370px),480px)]"
            }`}
        >
          <div className="space-y-5">
            <AnimatePresence initial={false}>
              {messages.map((message) => {
                const isUser =
                  message.sender === "user";

                return (
                  <motion.div
                    key={message.id}
                    initial={
                      reduceMotion
                        ? false
                        : {
                          opacity: 0,
                          y: 14,
                          x: isUser ? 15 : -15,
                        }
                    }
                    animate={{
                      opacity: 1,
                      y: 0,
                      x: 0,
                    }}
                    transition={{
                      duration: 0.35,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className={`flex ${isUser
                      ? "justify-end"
                      : "justify-start"
                      }`}
                  >
                    <div
                      className={`flex max-w-[92%] items-end gap-2.5 sm:max-w-[82%] ${isUser
                        ? "flex-row-reverse"
                        : ""
                        }`}
                    >
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${isUser
                          ? "border border-white/10 bg-white/[0.04] text-zinc-400"
                          : "bg-white text-black"
                          }`}
                      >
                        {isUser ? (
                          <User size={13} />
                        ) : (
                          <Bot size={13} />
                        )}
                      </div>

                      <div className="min-w-0">
                        {!isUser ? (
                          <p className="mb-1.5 ml-1 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                            {demoOnly
                              ? "Demo assistant"
                              : "AI Assistant"}
                          </p>
                        ) : null}

                        <div
                          className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 ${isUser
                            ? "rounded-br-md bg-white text-black"
                            : "rounded-bl-md border border-white/[0.08] bg-white/[0.035] text-zinc-300"
                            }`}
                        >
                          {message.text}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {loading ? (
              <motion.div
                initial={
                  reduceMotion
                    ? false
                    : { opacity: 0, y: 10 }
                }
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="flex items-end gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-black">
                    <Bot size={13} />
                  </div>

                  <div>
                    <p className="mb-1.5 ml-1 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                      {demoOnly
                        ? "Demo assistant"
                        : "AI Assistant"}
                    </p>

                    <div className="flex h-11 items-center gap-1.5 rounded-2xl rounded-bl-md border border-white/[0.08] bg-white/[0.035] px-4">
                      {[0, 1, 2].map((dot) => (
                        <motion.span
                          key={dot}
                          animate={
                            reduceMotion
                              ? undefined
                              : {
                                opacity: [
                                  0.25,
                                  1,
                                  0.25,
                                ],
                                y: [0, -3, 0],
                              }
                          }
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: dot * 0.15,
                          }}
                          className="h-1.5 w-1.5 rounded-full bg-zinc-400"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-white/[0.07] bg-black/30 p-4 sm:p-5">
          <AnimatePresence>
            {options.length > 0 &&
              !loading &&
              !readyToBook &&
              !completed ? (
              <motion.div
                initial={
                  reduceMotion
                    ? false
                    : { opacity: 0, y: 8 }
                }
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4"
              >
                <p className="mb-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                  Quick replies
                </p>

                <div className="flex flex-wrap gap-2">
                  {options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        void sendMessage(option.value)
                      }
                      disabled={loading}
                      className="rounded-xl border border-white/[0.09] bg-white/[0.035] px-3.5 py-2.5 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {error ? (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-xs leading-5 text-red-300 sm:text-sm"
            >
              {error}
            </div>
          ) : null}

          {readyToBook && !completed ? (
            <motion.div
              initial={
                reduceMotion
                  ? false
                  : { opacity: 0, y: 12 }
              }
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays
                  size={15}
                  className="text-white"
                />

                <p className="text-sm font-medium text-zinc-300">
                  {demoOnly
                    ? "Choose a sample appointment"
                    : lead.timeline
                      ? `Available times for ${lead.timeline.toLowerCase()}`
                      : "Choose an available appointment"}
                </p>
              </div>

              {demoOnly ? (
                <p className="mb-3 text-xs leading-5 text-zinc-500">
                  These times are illustrative. No
                  appointment or SMS will be created.
                </p>
              ) : null}

              {loadingSlots ? (
                <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-sm text-zinc-500">
                  <LoaderCircle
                    size={15}
                    className="animate-spin"
                  />

                  Checking availability...
                </div>
              ) : appointmentSlots.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {appointmentSlots.map((slot) => (
                    <button
                      key={slot.scheduledFor}
                      type="button"
                      onClick={() =>
                        void chooseAppointment(slot)
                      }
                      disabled={loading}
                      className="group flex items-center justify-between rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 py-3 text-left text-sm text-zinc-300 transition hover:border-white/20 hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span>{slot.label}</span>

                      <CalendarDays
                        size={14}
                        className="text-zinc-600 transition group-hover:text-black"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-sm text-zinc-500">
                  No appointment times are currently
                  available for this period.
                </div>
              )}
            </motion.div>
          ) : completed ? (
            <motion.div
              initial={
                reduceMotion
                  ? false
                  : { opacity: 0, scale: 0.97 }
              }
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white px-4 py-3 text-black"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-white">
                <Check size={15} />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  {demoOnly
                    ? "Demo appointment selected"
                    : "Appointment booked"}
                </p>

                <p className="mt-0.5 text-xs text-zinc-600">
                  {demoOnly
                    ? "Simulation complete. No real booking or SMS."
                    : "The lead qualification flow is complete."}
                </p>
              </div>
            </motion.div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2.5"
            >
              <div className="relative min-w-0 flex-1">
                <input
                  value={input}
                  onChange={(event) =>
                    setInput(event.target.value)
                  }
                  placeholder="Type your message..."
                  disabled={loading}
                  maxLength={demoOnly ? 500 : 2000}
                  autoComplete="off"
                  aria-label="Your message"
                  className="h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-white/20 focus:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Send message"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-black transition hover:scale-[1.03] hover:bg-zinc-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {loading ? (
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Send size={17} />
                )}
              </button>
            </form>
          )}

          {demoOnly && !completed ? (
            <p className="mt-3 text-[11px] leading-5 text-zinc-500">
              Use sample contact details. ZIP codes
              are checked against a public lookup.
              Type “change state” to correct the state.
            </p>
          ) : null}
        </div>
      </motion.section>

      {!compact ? (
        <motion.div
          initial={
            reduceMotion
              ? false
              : { opacity: 0, x: 45 }
          }
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: 0.65,
            delay: 0.12,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <LeadSummary
            lead={lead}
            status={status}
            completed={completed}
            demoOnly={demoOnly}
          />
        </motion.div>
      ) : null}

      {demoOnly ? (
        <DemoRegistrationPopup completed={completed} />
      ) : null}
    </div>
  );
}

function LeadSummary({
  lead,
  status,
  completed,
  demoOnly,
}: {
  lead: LeadData;
  status: LeadStatus;
  completed: boolean;
  demoOnly: boolean;
}) {
  const qualificationFields = demoOnly
    ? [
      lead.industry,
      lead.service,
      lead.state,
      lead.address,
      lead.zipVerified ? lead.zipCode : undefined,
      lead.urgency,
      lead.timeline,
      lead.name,
      lead.phone,
    ]
    : [
      lead.industry,
      lead.service,
      lead.location,
      lead.urgency,
      lead.timeline,
      lead.name,
      lead.phone,
    ];

  const completedFields =
    qualificationFields.filter(Boolean).length;

  const progress = Math.round(
    (completedFields / qualificationFields.length) *
    100,
  );

  return (
    <aside className="overflow-hidden rounded-[2rem] border border-white/[0.09] bg-[#080808] lg:sticky lg:top-24">
      <div className="border-b border-white/[0.07] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
              <CircleDot size={11} />

              {demoOnly
                ? "Simulated qualification"
                : "Live qualification"}
            </div>

            <h2 className="mt-3 text-xl font-semibold tracking-tight text-white">
              Lead profile
            </h2>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-white">
            <Flame size={17} />
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">
              Profile captured
            </span>

            <span className="font-medium text-zinc-300">
              {completed
                ? "Complete"
                : `${progress}%`}
            </span>
          </div>

          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: completed
                  ? "100%"
                  : `${progress}%`,
              }}
              transition={{
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="h-full rounded-full bg-white"
            />
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
              Current status
            </p>

            <p className="mt-1 text-sm font-medium text-zinc-200">
              {completed
                ? demoOnly
                  ? "Demo complete"
                  : "Appointment booked"
                : "Qualifying lead"}
            </p>
          </div>

          <StatusBadge status={status} />
        </div>

        <div className="mt-6">
          <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
            Captured details
          </p>

          <div className="space-y-3">
            <SummaryRow
              label="Industry"
              value={lead.industry}
            />

            <SummaryRow
              label="Service"
              value={lead.service}
            />

            {demoOnly ? (
              <>
                <SummaryRow
                  label="State"
                  value={lead.state}
                />

                <SummaryRow
                  label="Address"
                  value={lead.address}
                />

                <SummaryRow
                  label="City"
                  value={lead.city}
                />

                <SummaryRow
                  label="ZIP code"
                  value={
                    lead.zipCode
                      ? `${lead.zipCode}${lead.zipVerified
                        ? " · State matched"
                        : ""
                      }`
                      : undefined
                  }
                />
              </>
            ) : (
              <SummaryRow
                label="Location"
                value={lead.location}
              />
            )}

            <SummaryRow
              label="Urgency"
              value={lead.urgency}
            />

            <SummaryRow
              label="Timeline"
              value={lead.timeline}
            />

            <SummaryRow
              label="Name"
              value={lead.name}
            />

            <SummaryRow
              label="Phone"
              value={lead.phone}
            />
          </div>
        </div>

        {lead.appointment ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-xl bg-white p-4 text-black"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black text-white">
                <CalendarDays size={16} />
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  {demoOnly
                    ? "Sample appointment"
                    : "Appointment"}
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {lead.appointment}
                </p>
              </div>
            </div>
          </motion.div>
        ) : null}

        <div className="mt-6 border-t border-white/[0.07] pt-5">
          <div className="flex gap-3">
            <MapPin
              size={14}
              className="mt-0.5 shrink-0 text-zinc-500"
            />

            <p className="text-xs leading-5 text-zinc-500">
              {demoOnly
                ? "ZIP/state matching checks the geographic area. Street addresses and phone ownership are not verified. Appointment times are illustrative."
                : "Qualification details update automatically as the conversation progresses."}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function StatusBadge({
  status,
}: {
  status: LeadStatus;
}) {
  const labels: Record<LeadStatus, string> = {
    new: "New",
    warm: "Warm",
    hot: "Hot",
  };

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${status === "hot"
        ? "border-white bg-white text-black"
        : "border-white/10 bg-white/[0.035] text-zinc-400"
        }`}
    >
      {labels[status]}
    </span>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-3">
      <span className="shrink-0 text-sm text-zinc-500">
        {label}
      </span>

      <span className="max-w-[65%] break-words text-right text-sm text-zinc-200">
        {value || "—"}
      </span>
    </div>
  );
}