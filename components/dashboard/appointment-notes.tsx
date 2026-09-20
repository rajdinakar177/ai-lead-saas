"use client";

import { useState } from "react";

import { Check, Loader2, Pencil, Save, X } from "lucide-react";

type Props = {
  appointmentId: string;
  initialNotes?: string;
};

export function AppointmentNotes({ appointmentId, initialNotes = "" }: Props) {
  const [notes, setNotes] = useState(initialNotes);

  const [savedNotes, setSavedNotes] = useState(initialNotes);

  const [editing, setEditing] = useState(false);

  const [saving, setSaving] = useState(false);

  const [saved, setSaved] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function saveNotes() {
    if (saving) {
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save notes.");
      }

      const updatedNotes = data.notes ?? "";

      setNotes(updatedNotes);
      setSavedNotes(updatedNotes);

      setEditing(false);
      setSaved(true);

      window.setTimeout(() => {
        setSaved(false);
      }, 2000);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to save notes.",
      );
    } finally {
      setSaving(false);
    }
  }

  function cancelEditing() {
    setNotes(savedNotes);
    setError(null);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-400">
            {savedNotes || "No notes have been added yet."}
          </p>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-zinc-400 transition hover:border-blue-500/30 hover:bg-blue-500/5 hover:text-blue-400"
          >
            <Pencil size={14} />

            {savedNotes ? "Edit Notes" : "Add Notes"}
          </button>

          {saved && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Check size={14} />
              Saved
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        maxLength={2000}
        rows={6}
        placeholder="Add notes about this appointment..."
        className="w-full resize-y rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-500/40"
      />

      <div className="mt-2 flex justify-end text-xs text-zinc-600">
        {notes.length}/2000
      </div>

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={saveNotes}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}

          {saving ? "Saving..." : "Save Notes"}
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={cancelEditing}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-zinc-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
        >
          <X size={14} />
          Cancel
        </button>
      </div>
    </div>
  );
}
