"use client";

import {
  Check,
  Copy,
  ExternalLink,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";

type Props = {
  slug: string;
};

export function PublicLeadLink({
  slug,
}: Props) {
  const [copied, setCopied] =
    useState(false);

  const [publicUrl, setPublicUrl] =
    useState(
      `/lead/${slug}`
    );

  useEffect(() => {
    setPublicUrl(
      `${window.location.origin}/lead/${slug}`
    );
  }, [slug]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        publicUrl
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error(
        "Copy failed:",
        error
      );
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
      <div>
        <h2 className="font-semibold text-white">
          Public Lead Page
        </h2>

        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Share this link with customers or use it from your website to collect new leads.
        </p>
      </div>

      <div className="mt-6">
        <label className="text-xs uppercase tracking-wider text-zinc-600">
          Your Lead Page
        </label>

        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1 overflow-hidden rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="truncate text-sm text-zinc-300">
              {publicUrl}
            </p>
          </div>

          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
          >
            {copied ? (
              <>
                <Check
                  size={16}
                  className="text-emerald-400"
                />
                Copied
              </>
            ) : (
              <>
                <Copy size={16} />
                Copy Link
              </>
            )}
          </button>

          <a
            href={`/lead/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
          >
            Open Page
            <ExternalLink size={16} />
          </a>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-blue-500/15 bg-blue-500/[0.04] p-4">
        <p className="text-sm font-medium text-blue-300">
          How to use it
        </p>

        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Add this link to buttons such as{" "}
          <span className="text-zinc-300">
            Get a Quote
          </span>
          ,{" "}
          <span className="text-zinc-300">
            Book Service
          </span>{" "}
          or{" "}
          <span className="text-zinc-300">
            Contact Us
          </span>{" "}
          on your existing website.
        </p>
      </div>
    </div>
  );
}