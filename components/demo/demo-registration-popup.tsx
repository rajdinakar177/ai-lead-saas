"use client";

import Link from "next/link";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  MessageSquare,
  Sparkles,
  X,
} from "lucide-react";

import { useEffect, useId, useRef } from "react";

type DemoRegistrationPopupProps = {
  completed: boolean;
};

export function DemoRegistrationPopup({
  completed,
}: DemoRegistrationPopupProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!completed) {
      dialogRef.current?.close();
      return;
    }

    const timer = window.setTimeout(() => {
      const dialog = dialogRef.current;

      if (
        dialog &&
        dialog.isConnected &&
        !dialog.open
      ) {
        dialog.showModal();
      }
    }, 650);

    return () => window.clearTimeout(timer);
  }, [completed]);

  function closePopup() {
    dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          closePopup();
        }
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl border border-white/15 bg-[#101010] p-0 text-white shadow-2xl backdrop:bg-black/80 backdrop:backdrop-blur-sm"
    >
      <div className="relative p-6 sm:p-8">
        <button
          type="button"
          onClick={closePopup}
          aria-label="Close registration popup"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          <X size={18} />
        </button>

        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-black">
          <Sparkles size={23} />
        </div>

        <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
          Demo complete
        </p>

        <h2
          id={titleId}
          className="mt-2 text-2xl font-semibold leading-tight tracking-tight"
        >
          Let your business handle enquiries like this.
        </h2>

        <p
          id={descriptionId}
          className="mt-3 text-sm leading-6 text-zinc-400"
        >
          Register your business and set up an assistant
          to capture leads, qualify customer requests,
          and help book appointments.
        </p>

        <div className="my-6 space-y-3">
          <div className="flex items-center gap-3 text-sm text-zinc-300">
            <MessageSquare
              size={17}
              className="shrink-0 text-white"
            />
            Capture enquiries from your website
          </div>

          <div className="flex items-center gap-3 text-sm text-zinc-300">
            <CheckCircle2
              size={17}
              className="shrink-0 text-white"
            />
            Collect and qualify customer details
          </div>

          <div className="flex items-center gap-3 text-sm text-zinc-300">
            <CalendarDays
              size={17}
              className="shrink-0 text-white"
            />
            Guide qualified leads toward appointments
          </div>
        </div>

        <Link
          href="/register"
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          Register your business
          <ArrowRight size={17} />
        </Link>

        <button
          type="button"
          onClick={closePopup}
          className="mt-3 w-full rounded-xl py-3 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          Keep exploring
        </button>
      </div>
    </dialog>
  );
}