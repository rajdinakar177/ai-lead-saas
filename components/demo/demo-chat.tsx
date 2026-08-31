"use client";

import {
  Bot,
  CalendarDays,
  CheckCircle2,
  Flame,
  LoaderCircle,
  RefreshCcw,
  Send,
  User,
} from "lucide-react";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

/* =========================================================
   TYPES
   ========================================================= */

type Message = {
  id: string;
  sender: "ai" | "user";
  text: string;
};

type LeadData = {
  industry?: string;
  service?: string;
  location?: string;
  urgency?: string;
  timeline?: string;
  name?: string;
  phone?: string;
  appointment?: string;
};

type LeadStatus =
  | "new"
  | "warm"
  | "hot";

type ChatOption = {
  label: string;
  value: string;
};

type AppointmentSlot = {
  label: string;
  scheduledFor: string;
};

type ChatApiResponse = {
  reply: string;

  lead: {
    industry: string | null;
    service: string | null;
    location: string | null;
    urgency: string | null;
    timeline: string | null;
    name: string | null;
    phone: string | null;
  };

  status:
  | "new"
  | "warm"
  | "hot";

  readyToBook: boolean;

  options?: ChatOption[];

  messageId?: string;
};

type DemoChatProps = {
  businessSlug: string;
  businessName: string;
  compact?: boolean;
};

/* =========================================================
   DEMO CHAT
   ========================================================= */

export function DemoChat({
  businessSlug,
  businessName,
  compact = false,
}: DemoChatProps) {
  const [
    leadId,
    setLeadId,
  ] = useState<string | null>(
    null
  );

  const [
    initializing,
    setInitializing,
  ] = useState(true);

  const [
    options,
    setOptions,
  ] = useState<ChatOption[]>(
    []
  );

  const [
    messages,
    setMessages,
  ] = useState<Message[]>(
    []
  );

  const [
    lead,
    setLead,
  ] = useState<LeadData>(
    {}
  );

  const [
    status,
    setStatus,
  ] = useState<LeadStatus>(
    "new"
  );

  const [
    input,
    setInput,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    readyToBook,
    setReadyToBook,
  ] = useState(false);

  const [
    completed,
    setCompleted,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  const [
    appointmentSlots,
    setAppointmentSlots,
  ] = useState<AppointmentSlot[]>(
    []
  );

  const [
    loadingSlots,
    setLoadingSlots,
  ] = useState(false);

  const messagesEndRef =
    useRef<HTMLDivElement>(
      null
    );

  /* =========================================================
     LOAD REAL AVAILABILITY
     ========================================================= */

  async function loadAvailability(
    timeline: string,
    currentLeadId?: string
  ) {
    const id =
      currentLeadId ??
      leadId;

    if (
      !id ||
      !timeline
    ) {
      setAppointmentSlots(
        []
      );

      return;
    }

    try {
      setLoadingSlots(
        true
      );

      const response =
        await fetch(
          `/api/availability?leadId=${encodeURIComponent(
            id
          )}&timeline=${encodeURIComponent(
            timeline
          )}`
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Unable to load availability."
        );
      }

      setAppointmentSlots(
        data.slots ?? []
      );
    } catch (error) {
      console.error(
        "Availability error:",
        error
      );

      setAppointmentSlots(
        []
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load available appointments."
      );
    } finally {
      setLoadingSlots(
        false
      );
    }
  }

  /* =========================================================
     INITIALIZE / RESTORE LEAD
     ========================================================= */

  useEffect(() => {
    async function initializeDemo() {
      try {
        setInitializing(
          true
        );

        setError(null);

        const storageKey =
          `leadflow:${businessSlug}:leadId`;

        const storedLeadId =
          localStorage.getItem(
            storageKey
          );

        if (storedLeadId) {
          const response =
            await fetch(
              `/api/leads/${storedLeadId}`
            );

          if (response.ok) {
            const data =
              await response.json();

            setLeadId(
              data.lead.id
            );

            setMessages(
              data.messages
            );

            setLead({
              industry:
                data.lead.industry ??
                undefined,

              service:
                data.lead.service ??
                undefined,

              location:
                data.lead.location ??
                undefined,

              urgency:
                data.lead.urgency ??
                undefined,

              timeline:
                data.lead.timeline ??
                undefined,

              name:
                data.lead.name ??
                undefined,

              phone:
                data.lead.phone ??
                undefined,

              appointment:
                data.lead.appointment ??
                undefined,
            });

            setStatus(
              normalizeStatus(
                data.lead.status
              )
            );

            const isCompleted =
              Boolean(
                data.completed
              );

            const canBook =
              data.lead.status ===
              "qualified" &&
              !isCompleted;

            setCompleted(
              isCompleted
            );

            setReadyToBook(
              canBook
            );

            setOptions([]);

            if (
              canBook &&
              data.lead.timeline
            ) {
              await loadAvailability(
                data.lead.timeline,
                data.lead.id
              );
            }

            return;
          }

          localStorage.removeItem(
            storageKey
          );
        }

        await createNewLead();
      } catch (error) {
        console.error(
          error
        );

        setError(
          error instanceof Error
            ? error.message
            : "Unable to initialize demo."
        );
      } finally {
        setInitializing(
          false
        );
      }
    }

    async function createNewLead() {
      const response =
        await fetch(
          "/api/leads",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                businessSlug,
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Unable to create lead."
        );
      }

      setLeadId(
        data.lead.id
      );

      setMessages(
        data.messages
      );

      setLead({
        industry:
          data.lead.industry ??
          undefined,

        service:
          data.lead.service ??
          undefined,

        location:
          data.lead.location ??
          undefined,

        urgency:
          data.lead.urgency ??
          undefined,

        timeline:
          data.lead.timeline ??
          undefined,

        name:
          data.lead.name ??
          undefined,

        phone:
          data.lead.phone ??
          undefined,
      });

      setOptions(
        data.options ?? []
      );

      setAppointmentSlots(
        []
      );

      setStatus(
        "new"
      );

      setReadyToBook(
        false
      );

      setCompleted(
        false
      );

      const storageKey =
        `leadflow:${businessSlug}:leadId`;

      localStorage.setItem(
        storageKey,
        data.lead.id
      );
    }

    initializeDemo();
  }, [businessSlug]);

  /* =========================================================
     AUTO SCROLL
     ========================================================= */

  useEffect(() => {
    messagesEndRef.current
      ?.scrollIntoView({
        behavior:
          "smooth",
      });
  }, [
    messages,
    loading,
    options,
    appointmentSlots,
    loadingSlots,
  ]);

  /* =========================================================
     SEND MESSAGE
     ========================================================= */

  async function sendMessage(
    messageText?: string
  ) {
    const text =
      messageText?.trim() ||
      input.trim();

    if (
      !text ||
      loading ||
      completed ||
      !leadId
    ) {
      return;
    }

    setError(null);

    setOptions([]);

    const userMessage:
      Message = {
      id:
        crypto.randomUUID(),

      sender:
        "user",

      text,
    };

    const updatedMessages =
      [
        ...messages,
        userMessage,
      ];

    setMessages(
      updatedMessages
    );

    setInput("");

    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/chat",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                leadId,

                messages:
                  updatedMessages,

                lead,
              }),
          }
        );

      const data:
        ChatApiResponse =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.reply ||
          "Unable to send message."
        );
      }

      const updatedLead:
        LeadData = {
        industry:
          data.lead.industry ??
          undefined,

        service:
          data.lead.service ??
          undefined,

        location:
          data.lead.location ??
          undefined,

        urgency:
          data.lead.urgency ??
          undefined,

        timeline:
          data.lead.timeline ??
          undefined,

        name:
          data.lead.name ??
          undefined,

        phone:
          data.lead.phone ??
          undefined,

        appointment:
          lead.appointment,
      };

      setLead(
        updatedLead
      );

      setStatus(
        data.status
      );

      setOptions(
        data.options ??
        []
      );

      setMessages(
        (
          current
        ) => [
            ...current,

            {
              id:
                data.messageId ||
                crypto.randomUUID(),

              sender:
                "ai",

              text:
                data.reply,
            },
          ]
      );

      setReadyToBook(
        data.readyToBook
      );

      if (
        data.readyToBook &&
        data.lead.timeline
      ) {
        await loadAvailability(
          data.lead.timeline,
          leadId
        );
      } else {
        setAppointmentSlots(
          []
        );
      }
    } catch (error) {
      console.error(
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  /* =========================================================
     QUICK REPLY
     ========================================================= */

  async function handleOptionClick(
    option: ChatOption
  ) {
    if (
      loading ||
      completed
    ) {
      return;
    }

    setOptions([]);

    await sendMessage(
      option.value
    );
  }

  /* =========================================================
     FORM
     ========================================================= */

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    sendMessage();
  }

  /* =========================================================
     BOOK APPOINTMENT
     ========================================================= */

  async function chooseAppointment(
    slot: AppointmentSlot
  ) {
    if (
      !leadId ||
      loading
    ) {
      return;
    }

    try {
      setLoading(
        true
      );

      setError(null);

      setOptions([]);

      const response =
        await fetch(
          "/api/appointments",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                leadId,
                appointment:
                  slot.label,

                scheduledFor:
                  slot.scheduledFor,
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Unable to save appointment."
        );
      }

      const userMessage:
        Message = {
        id:
          crypto.randomUUID(),

        sender:
          "user",

        text:
          slot.label,
      };

      const aiMessage:
        Message = {
        id:
          data.messageId ||
          crypto.randomUUID(),

        sender:
          "ai",

        text:
          data.confirmation,
      };

      setMessages(
        (
          previous
        ) => [
            ...previous,
            userMessage,
            aiMessage,
          ]
      );

      setLead(
        (
          previous
        ) => ({
          ...previous,

          appointment:
            slot.label,
        })
      );

      setAppointmentSlots(
        []
      );

      setCompleted(
        true
      );

      setReadyToBook(
        false
      );

      setStatus(
        "hot"
      );
    } catch (error) {
      console.error(
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  /* =========================================================
     RESTART
     ========================================================= */

  async function restartDemo() {
    try {
      setInitializing(
        true
      );

      setError(null);

      setOptions([]);

      setAppointmentSlots(
        []
      );

      setLoadingSlots(
        false
      );

      const storageKey =
        `leadflow:${businessSlug}:leadId`;

      localStorage.removeItem(
        storageKey
      );

      const response =
        await fetch(
          "/api/leads",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                businessSlug,
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Unable to restart conversation."
        );
      }

      setLeadId(
        data.lead.id
      );

      setMessages(
        data.messages
      );

      setLead({
        industry:
          data.lead.industry ??
          undefined,

        service:
          data.lead.service ??
          undefined,

        location:
          data.lead.location ??
          undefined,

        urgency:
          data.lead.urgency ??
          undefined,

        timeline:
          data.lead.timeline ??
          undefined,

        name:
          data.lead.name ??
          undefined,

        phone:
          data.lead.phone ??
          undefined,
      });

      setOptions(
        data.options ?? []
      );

      setStatus(
        "new"
      );

      setReadyToBook(
        false
      );

      setCompleted(
        false
      );

      setLoading(
        false
      );

      localStorage.setItem(
        storageKey,
        data.lead.id
      );
    } catch (error) {
      console.error(
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to restart conversation."
      );
    } finally {
      setInitializing(
        false
      );
    }
  }

  /* =========================================================
     INITIAL LOADING
     ========================================================= */

  if (initializing) {
    return (
      <div className="flex min-h-[500px] items-center justify-center rounded-3xl border border-white/10 bg-zinc-950">
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <LoaderCircle
            size={18}
            className="animate-spin"
          />

          Loading conversation...
        </div>
      </div>
    );
  }

  /* =========================================================
     UI
     ========================================================= */

  return (
    <div
      className={
        compact
          ? "w-full"
          : "grid gap-6 lg:grid-cols-[1.4fr_0.8fr]"
      }
    >
      {/* CHAT */}

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-950">
        {/* HEADER */}

        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/15 text-blue-400">
              <Bot
                size={20}
              />
            </div>

            <div>
              <p className="font-medium">
                {businessName} AI
              </p>

              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />

                Powered by AI
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={
              restartDemo
            }
            disabled={
              loading
            }
            className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs text-zinc-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
          >
            <RefreshCcw
              size={14}
            />

            Restart
          </button>
        </div>

        {/* MESSAGES */}

        <div
          className={`space-y-5 overflow-y-auto px-5 py-6 ${compact
              ? "h-[430px]"
              : "h-[500px]"
            }`}
        >
          {messages.map(
            (
              message
            ) => (
              <div
                key={
                  message.id
                }
                className={`flex ${message.sender ===
                    "user"
                    ? "justify-end"
                    : "justify-start"
                  }`}
              >
                <div
                  className={`flex max-w-[85%] gap-3 ${message.sender ===
                      "user"
                      ? "flex-row-reverse"
                      : "flex-row"
                    }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${message.sender ===
                        "user"
                        ? "bg-white text-black"
                        : "bg-violet-500/15 text-blue-400"
                      }`}
                  >
                    {message.sender ===
                      "user" ? (
                      <User
                        size={15}
                      />
                    ) : (
                      <Bot
                        size={15}
                      />
                    )}
                  </div>

                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-6 ${message.sender ===
                        "user"
                        ? "rounded-tr-md bg-white text-black"
                        : "rounded-tl-md border border-white/10 bg-white/[0.04] text-zinc-200"
                      }`}
                  >
                    {message.text}
                  </div>
                </div>
              </div>
            )
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/15 text-blue-400">
                  <Bot
                    size={15}
                  />
                </div>

                <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-400">
                  <LoaderCircle
                    size={16}
                    className="animate-spin"
                  />

                  Thinking...
                </div>
              </div>
            </div>
          )}

          <div
            ref={
              messagesEndRef
            }
          />
        </div>

        {/* INPUT */}

        <div className="border-t border-white/10 p-5">
          {/* QUICK REPLIES */}

          {options.length >
            0 &&
            !loading &&
            !readyToBook &&
            !completed && (
              <div className="mb-4 flex flex-wrap gap-2">
                {options.map(
                  (
                    option
                  ) => (
                    <button
                      key={
                        option.value
                      }
                      type="button"
                      onClick={() =>
                        handleOptionClick(
                          option
                        )
                      }
                      disabled={
                        loading
                      }
                      className="rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-sm text-violet-200 transition hover:border-violet-400/50 hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {option.label}
                    </button>
                  )
                )}
              </div>
            )}

          {/* ERROR */}

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* APPOINTMENTS */}

          {readyToBook &&
            !completed ? (
            <div>
              <p className="mb-3 text-sm text-zinc-400">
                {lead.timeline
                  ? `Available appointments for ${lead.timeline.toLowerCase()}:`
                  : "Choose an available appointment:"}
              </p>

              {loadingSlots ? (
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <LoaderCircle
                    size={16}
                    className="animate-spin"
                  />

                  Loading available appointments...
                </div>
              ) : appointmentSlots.length >
                0 ? (
                <div className="flex flex-wrap gap-2">
                  {appointmentSlots.map(
                    (
                      slot
                    ) => (
                      <button
                        key={
                          slot.scheduledFor
                        }
                        type="button"
                        onClick={() =>
                          chooseAppointment(
                            slot
                          )
                        }
                        disabled={
                          loading
                        }
                        className="rounded-full border border-violet-500/30 bg-blue-500/10 px-4 py-2.5 text-sm text-violet-200 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {slot.label}
                      </button>
                    )
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-500">
                  No appointment
                  times are currently
                  available for this
                  period.
                </div>
              )}
            </div>
          ) : completed ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-400">
              <CheckCircle2
                size={18}
              />

              Lead qualified and
              appointment booked
            </div>
          ) : (
            <form
              onSubmit={
                handleSubmit
              }
              className="flex gap-3"
            >
              <input
                value={
                  input
                }
                onChange={(
                  event
                ) =>
                  setInput(
                    event.target
                      .value
                  )
                }
                placeholder="Describe what you need..."
                disabled={
                  loading
                }
                autoComplete="off"
                className="flex-1 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-500/50 disabled:cursor-not-allowed disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={
                  loading ||
                  !input.trim() ||
                  !leadId
                }
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? (
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Send
                    size={17}
                  />
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* LEAD SUMMARY */}

      {!compact && (
        <LeadSummary
          lead={
            lead
          }
          status={
            status
          }
          completed={
            completed
          }
        />
      )}
    </div>
  );
}

/* =========================================================
   LEAD SUMMARY
   ========================================================= */

function LeadSummary({
  lead,
  status,
  completed,
}: {
  lead: LeadData;
  status: LeadStatus;
  completed: boolean;
}) {
  return (
    <aside className="h-fit rounded-3xl border border-white/10 bg-white/[0.03] p-6 lg:sticky lg:top-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500">
            Live Lead Profile
          </p>

          <h2 className="mt-1 text-xl font-semibold">
            Qualification
          </h2>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
          <Flame
            size={19}
          />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
        <p className="text-xs uppercase tracking-wider text-zinc-600">
          Lead Status
        </p>

        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="font-medium text-white">
            {completed
              ? "Appointment Booked"
              : "Qualifying"}
          </span>

          <StatusBadge
            status={
              status
            }
          />
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <SummaryRow
          label="Industry"
          value={
            lead.industry
          }
        />

        <SummaryRow
          label="Service"
          value={
            lead.service
          }
        />

        <SummaryRow
          label="Location"
          value={
            lead.location
          }
        />

        <SummaryRow
          label="Urgency"
          value={
            lead.urgency
          }
        />

        <SummaryRow
          label="Timeline"
          value={
            lead.timeline
          }
        />

        <SummaryRow
          label="Name"
          value={
            lead.name
          }
        />

        <SummaryRow
          label="Phone"
          value={
            lead.phone
          }
        />
      </div>

      {lead.appointment && (
        <div className="mt-6 rounded-2xl border border-blue-500/20 bg-violet-500/5 p-4">
          <div className="flex items-center gap-3">
            <CalendarDays
              size={19}
              className="text-blue-400"
            />

            <div>
              <p className="text-xs text-zinc-500">
                Appointment
              </p>

              <p className="mt-1 text-sm font-medium text-white">
                {
                  lead.appointment
                }
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 border-t border-white/10 pt-5">
        <p className="text-xs leading-5 text-zinc-600">
          Lead qualification
          information is
          extracted from the
          conversation in real
          time.
        </p>
      </div>
    </aside>
  );
}

/* =========================================================
   STATUS BADGE
   ========================================================= */

function StatusBadge({
  status,
}: {
  status: LeadStatus;
}) {
  const styles = {
    new:
      "bg-zinc-500/10 text-zinc-400",

    warm:
      "bg-amber-500/10 text-amber-400",

    hot:
      "bg-red-500/10 text-red-400",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${styles[status]}`}
    >
      {status}
    </span>
  );
}

/* =========================================================
   SUMMARY ROW
   ========================================================= */

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-3">
      <span className="text-sm text-zinc-500">
        {label}
      </span>

      <span className="max-w-[60%] text-right text-sm text-zinc-200">
        {value || "—"}
      </span>
    </div>
  );
}

/* =========================================================
   STATUS NORMALIZER
   ========================================================= */

function normalizeStatus(
  status: string
): LeadStatus {
  if (
    status === "hot" ||
    status ===
    "qualified" ||
    status === "booked"
  ) {
    return "hot";
  }

  if (
    status === "warm"
  ) {
    return "warm";
  }

  return "new";
}