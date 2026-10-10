"use client";

import {
  ArrowRight,
  Bot,
  CalendarCheck2,
  Check,
  MessageSquareText,
  Sparkles,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";

const activity = [
  {
    icon: MessageSquareText,
    title: "Lead responded",
    description: "Roof leak · urgent request",
  },
  {
    icon: Bot,
    title: "AI qualified the lead",
    description: "Service, timeline and contact captured",
  },
  {
    icon: CalendarCheck2,
    title: "Appointment ready",
    description: "Available booking times presented",
  },
];

export function Hero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative isolate min-h-screen overflow-hidden pb-24 pt-32 sm:pt-36 lg:flex lg:items-center lg:pb-28 lg:pt-32">
      <div className="signal-field pointer-events-none absolute inset-0 -z-20 bg-black" />

      {!reduceMotion && (
        <div className="ping-rings -z-10">
          <div className="ping-ring" />
          <div className="ping-ring ping-ring--delay-1" />
          <div className="ping-ring ping-ring--delay-2" />
        </div>
      )}

      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-[#3e7bfa]/[0.07] blur-[120px]" />

      <div className="mx-auto grid w-full max-w-7xl items-center gap-16 px-5 lg:grid-cols-[1.02fr_0.98fr] lg:px-8">
        <motion.div
          initial={
            reduceMotion
              ? false
              : {
                  opacity: 0,
                  y: 35,
                }
          }
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.75,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-zinc-300 shadow-2xl shadow-black">
            <Sparkles size={14} className="text-white" />
            AI lead conversion for local service businesses
          </div>

          <h1 className="mt-7 max-w-4xl text-[3.25rem] font-semibold leading-[0.98] tracking-[-0.055em] text-white sm:text-6xl lg:text-[4.7rem]">
            Your next customer
            <span className="block text-zinc-500">shouldn&apos;t have to wait.</span>
          </h1>

          <p className="mt-7 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg sm:leading-8">
            Capture leads, respond instantly, qualify prospects and move them
            toward an appointment with one AI-powered workflow built for
            roofing and HVAC businesses.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              Start converting leads
              <ArrowRight
                size={17}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>

            <Link
              href="/demo"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-6 py-3.5 text-sm font-medium text-white transition hover:bg-white/[0.06]"
            >
              <Sparkles size={16} />
              Try the AI demo
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
            {[
              "24/7 lead response",
              "AI qualification",
              "Appointment booking",
            ].map((item) => (
              <span
                key={item}
                className="flex items-center gap-2 text-xs text-zinc-500 sm:text-sm"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                  <Check size={11} className="text-white" />
                </span>

                {item}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={
            reduceMotion
              ? false
              : {
                  opacity: 0,
                  x: 80,
                  scale: 0.96,
                }
          }
          animate={{
            opacity: 1,
            x: 0,
            scale: 1,
          }}
          transition={{
            duration: 0.9,
            delay: 0.12,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="relative mx-auto w-full max-w-xl lg:mx-0"
        >
          <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-white/[0.025] blur-3xl" />

          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#090909] shadow-[0_40px_120px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              </div>

              <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] text-zinc-500">
                Live lead workflow
              </div>
            </div>

            <div className="p-4 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/30" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                    </span>

                    <span className="text-xs font-medium text-zinc-400">
                      New lead
                    </span>
                  </div>

                  <h2 className="mt-3 text-xl font-semibold tracking-tight text-white">
                    Emergency roof repair
                  </h2>

                  <p className="mt-1 text-sm text-zinc-600">
                    Website · just now
                  </p>
                </div>

                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium text-white">
                  HOT
                </span>
              </div>

              <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-black">
                    <Bot size={17} />
                  </div>

                  <div>
                    <p className="text-xs font-medium text-zinc-500">
                      AI Assistant
                    </p>

                    <p className="mt-2 text-sm leading-6 text-zinc-300">
                      I can help with that. Is the roof actively leaking right
                      now, and what ZIP code is the property in?
                    </p>
                  </div>
                </div>
              </div>

              <div className="ml-auto mt-3 max-w-[85%] rounded-2xl rounded-tr-md bg-white px-4 py-3 text-sm leading-6 text-black">
                Yes, it&apos;s leaking near the kitchen. I need someone this
                week.
              </div>

              <div className="mt-6 space-y-2.5">
                {activity.map((item, index) => {
                  const Icon = item.icon;

                  return (
                    <motion.div
                      key={item.title}
                      initial={
                        reduceMotion
                          ? false
                          : {
                              opacity: 0,
                              x: 28,
                            }
                      }
                      animate={{
                        opacity: 1,
                        x: 0,
                      }}
                      transition={{
                        duration: 0.5,
                        delay: 0.7 + index * 0.16,
                      }}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.035] text-white">
                        <Icon size={16} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-200">
                          {item.title}
                        </p>

                        <p className="mt-0.5 truncate text-xs text-zinc-600">
                          {item.description}
                        </p>
                      </div>

                      <Check size={15} className="shrink-0 text-zinc-500" />
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          <motion.div
            animate={
              reduceMotion
                ? undefined
                : {
                    y: [0, -8, 0],
                  }
            }
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -bottom-8 -left-5 hidden rounded-2xl border border-white/10 bg-black/90 p-4 shadow-2xl backdrop-blur-xl sm:block"
          >
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-600">
              Status
            </p>

            <div className="mt-2 flex items-center gap-2">
              <CalendarCheck2 size={17} className="text-white" />
              <span className="text-sm font-medium text-white">
                Ready to book
              </span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}