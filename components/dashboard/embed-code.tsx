"use client";

import {
  Check,
  Code2,
  Copy,
  MessageCircleMore,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";

type Props = {
  slug: string;
};

export function EmbedCode({
  slug,
}: Props) {
  const [copied, setCopied] =
    useState(false);

  const baseUrl =
    typeof window !==
    "undefined"
      ? window.location.origin
      : "";

  const widgetCode =
    useMemo(
      () => `<script
  src="${baseUrl}/widget.js"
  data-business="${slug}"
></script>`,
      [
        baseUrl,
        slug,
      ]
    );

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(
        widgetCode
      );

      setCopied(true);

      setTimeout(
        () =>
          setCopied(
            false
          ),
        2000
      );
    } catch (error) {
      console.error(
        "Unable to copy widget code:",
        error
      );
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
          <MessageCircleMore
            size={20}
          />
        </div>

        <div>
          <h2 className="font-semibold text-white">
            Website Widget
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Add your AI lead
            assistant to your
            existing website with
            one script tag.
          </p>
        </div>
      </div>

      <div className="mt-7">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-600">
          <Code2
            size={14}
          />

          Installation Code
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
          <pre className="overflow-x-auto p-5 text-sm leading-6 text-zinc-300">
            <code>
              {
                widgetCode
              }
            </code>
          </pre>
        </div>
      </div>

      <button
        type="button"
        onClick={
          copyCode
        }
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
      >
        {copied ? (
          <>
            <Check
              size={
                16
              }
              className="text-emerald-600"
            />

            Copied
          </>
        ) : (
          <>
            <Copy
              size={
                16
              }
            />

            Copy Code
          </>
        )}
      </button>

      <div className="mt-6 rounded-2xl border border-violet-500/15 bg-violet-500/[0.04] p-5">
        <p className="text-sm font-medium text-violet-300">
          Installation
        </p>

        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Paste the code
          immediately before
          the closing{" "}
          <code className="rounded bg-black/30 px-1.5 py-0.5 text-zinc-300">
            &lt;/body&gt;
          </code>{" "}
          tag on your website.
        </p>

        <p className="mt-3 text-sm leading-6 text-zinc-500">
          The widget will
          automatically appear in
          the bottom-right corner.
        </p>
      </div>
    </div>
  );
}