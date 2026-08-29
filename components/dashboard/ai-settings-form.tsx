"use client";

import {  useMemo, useState } from "react";
import {
    Bot,
    CheckCircle2,
    CirclePlus,
    LoaderCircle,
    Save,
    Sparkles,
    X,
} from "lucide-react";
import { motion } from "motion/react";

type Tone =
    | "friendly"
    | "professional"
    | "casual";

type QualificationField =
    | "name"
    | "phone"
    | "service"
    | "urgency"
    | "timeline";

type AISettings = {
    businessDescription: string;
    services: string[];
    serviceAreas: string[];
    welcomeMessage: string;
    tone: Tone;
    qualificationFields: QualificationField[];
    additionalInstructions: string;
};

type Props = {
    initialSettings?: Partial<AISettings>;
};

const qualificationOptions: {
    value: QualificationField;
    label: string;
    description: string;
}[] = [
        {
            value: "name",
            label: "Customer Name",
            description: "Ask for the lead's name.",
        },
        {
            value: "phone",
            label: "Phone Number",
            description: "Collect the best callback number.",
        },
        {
            value: "service",
            label: "Service Needed",
            description: "Understand what service the lead needs.",
        },
        {
            value: "urgency",
            label: "Urgency",
            description: "Determine how urgent the request is.",
        },
        {
            value: "timeline",
            label: "Preferred Timeline",
            description: "Ask when they want service.",
        },
    ];

export function AISettingsForm({
    initialSettings,
}: Props) {
    const defaults = useMemo<AISettings>(
        () => ({
            businessDescription:
                initialSettings?.businessDescription ?? "",
            services:
                initialSettings?.services ?? [],
            serviceAreas:
                initialSettings?.serviceAreas ?? [],
            welcomeMessage:
                initialSettings?.welcomeMessage ?? "",
            tone:
                initialSettings?.tone ?? "friendly",
            qualificationFields:
                initialSettings?.qualificationFields ?? [
                    "name",
                    "phone",
                    "service",
                    "urgency",
                    "timeline",
                ],
            additionalInstructions:
                initialSettings?.additionalInstructions ?? "",
        }),
        [initialSettings]
    );

    const [businessDescription, setBusinessDescription] =
        useState(defaults.businessDescription);

    const [services, setServices] =
        useState<string[]>(defaults.services);

    const [serviceInput, setServiceInput] =
        useState("");

    const [serviceAreas, setServiceAreas] =
        useState<string[]>(defaults.serviceAreas);

    const [serviceAreaInput, setServiceAreaInput] =
        useState("");

    const [welcomeMessage, setWelcomeMessage] =
        useState(defaults.welcomeMessage);

    const [tone, setTone] =
        useState<Tone>(defaults.tone);

    const [
        qualificationFields,
        setQualificationFields,
    ] = useState<QualificationField[]>(
        defaults.qualificationFields
    );

    const [
        additionalInstructions,
        setAdditionalInstructions,
    ] = useState(
        defaults.additionalInstructions
    );

    const [loading, setLoading] =
        useState(false);

    const [success, setSuccess] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);

    function addService() {
        const value =
            serviceInput.trim();

        if (!value) return;

        const exists = services.some(
            (service) =>
                service.toLowerCase() ===
                value.toLowerCase()
        );

        if (exists) {
            setServiceInput("");
            return;
        }

        setServices((previous) => [
            ...previous,
            value,
        ]);

        setServiceInput("");
    }

    function removeService(
        value: string
    ) {
        setServices((previous) =>
            previous.filter(
                (service) =>
                    service !== value
            )
        );
    }

    function addServiceArea() {
        const value =
            serviceAreaInput.trim();

        if (!value) return;

        const exists =
            serviceAreas.some(
                (area) =>
                    area.toLowerCase() ===
                    value.toLowerCase()
            );

        if (exists) {
            setServiceAreaInput("");
            return;
        }

        setServiceAreas(
            (previous) => [
                ...previous,
                value,
            ]
        );

        setServiceAreaInput("");
    }

    function removeServiceArea(
        value: string
    ) {
        setServiceAreas(
            (previous) =>
                previous.filter(
                    (area) =>
                        area !== value
                )
        );
    }

    function toggleQualification(
        value: QualificationField
    ) {
        setQualificationFields(
            (previous) => {
                if (
                    previous.includes(
                        value
                    )
                ) {
                    return previous.filter(
                        (field) =>
                            field !== value
                    );
                }

                return [
                    ...previous,
                    value,
                ];
            }
        );
    }

   async function handleSubmit(
  event: React.SubmitEvent<HTMLFormElement>
) {
  event.preventDefault();

  try {
    setLoading(true);
    setError(null);
    setSuccess(false);

    const response =
      await fetch(
        "/api/business/ai-settings",
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            businessDescription,
            services,
            serviceAreas,
            welcomeMessage,
            tone,
            qualificationFields,
            additionalInstructions,
          }),
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "Unable to save AI settings."
      );
    }

    setSuccess(true);
  } catch (error) {
    console.error(error);

    setError(
      error instanceof Error
        ? error.message
        : "Unable to save AI settings."
    );
  } finally {
    setLoading(false);
  }
}

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-6"
        >
            {error && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                    {error}
                </div>
            )}

            {success && (
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-400">
                    <CheckCircle2
                        size={17}
                    />
                    AI settings ready.
                </div>
            )}

            <motion.section
                initial={{
                    opacity: 0,
                    y: 12,
                }}
                animate={{
                    opacity: 1,
                    y: 0,
                }}
                transition={{
                    duration: 0.35,
                }}
                className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-8"
            >
                <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-400/10 bg-blue-500/10 text-blue-400">
                        <Bot size={20} />
                    </div>

                    <div>
                        <h2 className="font-semibold text-white">
                            AI Assistant
                        </h2>

                        <p className="mt-1 text-sm leading-6 text-zinc-500">
                            Configure what your
                            assistant knows and how it
                            should communicate with
                            leads.
                        </p>
                    </div>
                </div>

                <div className="mt-7">
                    <label className="text-sm text-zinc-400">
                        Business Description
                    </label>

                    <textarea
                        value={
                            businessDescription
                        }
                        onChange={(event) =>
                            setBusinessDescription(
                                event.target.value
                            )
                        }
                        rows={5}
                        placeholder="Example: ABC Home Services provides residential roofing and HVAC services across Austin, Texas."
                        className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-700 focus:border-blue-500/50"
                    />

                    <p className="mt-2 text-xs text-zinc-700">
                        Give the AI enough context to
                        understand what your business
                        does.
                    </p>
                </div>
            </motion.section>

            <motion.section
                initial={{
                    opacity: 0,
                    y: 12,
                }}
                animate={{
                    opacity: 1,
                    y: 0,
                }}
                transition={{
                    duration: 0.35,
                    delay: 0.05,
                }}
                className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 sm:p-8"
            >
                <h2 className="font-semibold text-white">
                    Services
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                    Add the services customers can
                    ask about.
                </p>

                <div className="mt-5 flex gap-2">
                    <input
                        value={serviceInput}
                        onChange={(event) =>
                            setServiceInput(
                                event.target.value
                            )
                        }
                        onKeyDown={(event) => {
                            if (
                                event.key ===
                                "Enter"
                            ) {
                                event.preventDefault();
                                addService();
                            }
                        }}
                        placeholder="Roof Repair"
                        className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-blue-500/50"
                    />

                    <button
                        type="button"
                        onClick={addService}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
                    >
                        <CirclePlus
                            size={17}
                        />
                        Add
                    </button>
                </div>

                {services.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {services.map(
                            (service) => (
                                <Tag
                                    key={service}
                                    value={service}
                                    onRemove={() =>
                                        removeService(
                                            service
                                        )
                                    }
                                />
                            )
                        )}
                    </div>
                )}
            </motion.section>

            <motion.section
                initial={{
                    opacity: 0,
                    y: 12,
                }}
                animate={{
                    opacity: 1,
                    y: 0,
                }}
                transition={{
                    duration: 0.35,
                    delay: 0.1,
                }}
                className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 sm:p-8"
            >
                <h2 className="font-semibold text-white">
                    Service Areas
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                    Tell the assistant which cities,
                    regions, or neighborhoods your
                    business serves.
                </p>

                <div className="mt-5 flex gap-2">
                    <input
                        value={
                            serviceAreaInput
                        }
                        onChange={(event) =>
                            setServiceAreaInput(
                                event.target.value
                            )
                        }
                        onKeyDown={(event) => {
                            if (
                                event.key ===
                                "Enter"
                            ) {
                                event.preventDefault();
                                addServiceArea();
                            }
                        }}
                        placeholder="Austin"
                        className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-blue-500/50"
                    />

                    <button
                        type="button"
                        onClick={
                            addServiceArea
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
                    >
                        <CirclePlus
                            size={17}
                        />
                        Add
                    </button>
                </div>

                {serviceAreas.length >
                    0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {serviceAreas.map(
                                (area) => (
                                    <Tag
                                        key={area}
                                        value={area}
                                        onRemove={() =>
                                            removeServiceArea(
                                                area
                                            )
                                        }
                                    />
                                )
                            )}
                        </div>
                    )}
            </motion.section>

            <motion.section
                initial={{
                    opacity: 0,
                    y: 12,
                }}
                animate={{
                    opacity: 1,
                    y: 0,
                }}
                transition={{
                    duration: 0.35,
                    delay: 0.15,
                }}
                className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 sm:p-8"
            >
                <h2 className="font-semibold text-white">
                    Conversation Style
                </h2>

                <div className="mt-6">
                    <label className="text-sm text-zinc-400">
                        Welcome Message
                    </label>

                    <input
                        value={welcomeMessage}
                        onChange={(event) =>
                            setWelcomeMessage(
                                event.target.value
                            )
                        }
                        placeholder="Hi! 👋 How can we help you today?"
                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-blue-500/50"
                    />
                </div>

                <div className="mt-6">
                    <label className="text-sm text-zinc-400">
                        Assistant Tone
                    </label>

                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        {(
                            [
                                "friendly",
                                "professional",
                                "casual",
                            ] as Tone[]
                        ).map((option) => {
                            const selected =
                                tone === option;

                            return (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() =>
                                        setTone(
                                            option
                                        )
                                    }
                                    className={`rounded-2xl border p-4 text-left transition ${selected
                                            ? "border-blue-500/40 bg-blue-500/10"
                                            : "border-white/10 bg-black/10 hover:bg-white/[0.03]"
                                        }`}
                                >
                                    <p
                                        className={`text-sm font-medium capitalize ${selected
                                                ? "text-blue-300"
                                                : "text-white"
                                            }`}
                                    >
                                        {option}
                                    </p>

                                    <p className="mt-1 text-xs leading-5 text-zinc-600">
                                        {getToneDescription(
                                            option
                                        )}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </motion.section>

            <motion.section
                initial={{
                    opacity: 0,
                    y: 12,
                }}
                animate={{
                    opacity: 1,
                    y: 0,
                }}
                transition={{
                    duration: 0.35,
                    delay: 0.2,
                }}
                className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 sm:p-8"
            >
                <h2 className="font-semibold text-white">
                    Lead Qualification
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                    Choose what information the AI
                    should collect before a lead is
                    considered qualified.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {qualificationOptions.map(
                        (option) => {
                            const selected =
                                qualificationFields.includes(
                                    option.value
                                );

                            return (
                                <button
                                    key={
                                        option.value
                                    }
                                    type="button"
                                    onClick={() =>
                                        toggleQualification(
                                            option.value
                                        )
                                    }
                                    className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${selected
                                            ? "border-blue-500/30 bg-blue-500/[0.07]"
                                            : "border-white/10 bg-black/10 hover:bg-white/[0.03]"
                                        }`}
                                >
                                    <div
                                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${selected
                                                ? "border-blue-400 bg-blue-500 text-white"
                                                : "border-white/20"
                                            }`}
                                    >
                                        {selected && (
                                            <CheckCircle2
                                                size={
                                                    13
                                                }
                                            />
                                        )}
                                    </div>

                                    <div>
                                        <p className="text-sm font-medium text-white">
                                            {
                                                option.label
                                            }
                                        </p>

                                        <p className="mt-1 text-xs leading-5 text-zinc-600">
                                            {
                                                option.description
                                            }
                                        </p>
                                    </div>
                                </button>
                            );
                        }
                    )}
                </div>
            </motion.section>

            <motion.section
                initial={{
                    opacity: 0,
                    y: 12,
                }}
                animate={{
                    opacity: 1,
                    y: 0,
                }}
                transition={{
                    duration: 0.35,
                    delay: 0.25,
                }}
                className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 sm:p-8"
            >
                <div className="flex items-center gap-2">
                    <Sparkles
                        size={18}
                        className="text-blue-400"
                    />

                    <h2 className="font-semibold text-white">
                        Additional Instructions
                    </h2>
                </div>

                <p className="mt-1 text-sm text-zinc-500">
                    Add business-specific rules or
                    behavior for the assistant.
                </p>

                <textarea
                    value={
                        additionalInstructions
                    }
                    onChange={(event) =>
                        setAdditionalInstructions(
                            event.target.value
                        )
                    }
                    rows={5}
                    placeholder="Example: Treat active roof leaks as high priority. Do not discuss pricing. Ask for the property ZIP code if needed."
                    className="mt-5 w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-zinc-700 focus:border-blue-500/50"
                />
            </motion.section>

            <div className="flex justify-end pb-4">
                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {loading ? (
                        <>
                            <LoaderCircle
                                size={17}
                                className="animate-spin"
                            />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save
                                size={17}
                            />
                            Save AI Settings
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}

function Tag({
    value,
    onRemove,
}: {
    value: string;
    onRemove: () => void;
}) {
    return (
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/15 bg-blue-500/[0.07] px-3 py-1.5 text-sm text-blue-200">
            {value}

            <button
                type="button"
                onClick={onRemove}
                className="text-blue-300/70 transition hover:text-white"
                aria-label={`Remove ${value}`}
            >
                <X size={14} />
            </button>
        </div>
    );
}

function getToneDescription(
    tone: Tone
) {
    switch (tone) {
        case "professional":
            return "Clear, polished and business-focused.";

        case "casual":
            return "Relaxed and conversational.";

        default:
            return "Warm, helpful and approachable.";
    }
}