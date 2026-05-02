"use client";

import { useState, useEffect } from "react";
import { X, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (strokes: number) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  holeNumber: number;
  par: number;
  initialStrokes?: number | null;
  // Extra contextual copy lines (e.g. "Reid gets a stroke here")
  notes?: string[];
  playerLabel?: string;
};

export function HoleEntrySheet({
  open,
  onClose,
  onSubmit,
  onDelete,
  holeNumber,
  par,
  initialStrokes,
  notes,
  playerLabel,
}: Props) {
  const [strokes, setStrokes] = useState<number>(initialStrokes ?? par);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStrokes(initialStrokes ?? par);
      setError(null);
    }
  }, [open, initialStrokes, par]);

  async function commit() {
    if (strokes < 1 || strokes > 15) {
      setError("Strokes must be 1–15.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(strokes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function destroy() {
    if (!onDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  }

  const canDelete = !!onDelete && initialStrokes !== null && initialStrokes !== undefined;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm bg-[var(--color-paper)] rounded-t-xl sm:rounded-xl p-6 border-t sm:border border-[var(--color-rule)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="eyebrow">Hole {holeNumber}</div>
            <div className="font-display text-xl text-[var(--color-navy)]">
              Par {par}
            </div>
            {playerLabel && (
              <div className="font-body-serif italic text-neutral-700 text-sm mt-1">
                {playerLabel}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 hover:bg-[var(--color-cream)] rounded"
          >
            <X size={20} />
          </button>
        </div>

        {notes && notes.length > 0 && (
          <ul className="text-xs font-ui text-[var(--color-gold)] uppercase tracking-[0.2em] mb-4 space-y-1">
            {notes.map((n, i) => (
              <li key={i}>• {n}</li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-center gap-6 mb-6">
          <button
            onClick={() => setStrokes((v) => Math.max(1, v - 1))}
            className="w-14 h-14 rounded-full bg-[var(--color-cream)] border border-[var(--color-rule)] text-[var(--color-navy)] flex items-center justify-center hover:bg-[var(--color-gold-light)]/30"
            aria-label="Decrease"
          >
            <Minus size={24} />
          </button>
          <div className="font-mono text-6xl tabular-nums w-20 text-center text-[var(--color-navy)]">
            {strokes}
          </div>
          <button
            onClick={() => setStrokes((v) => Math.min(15, v + 1))}
            className="w-14 h-14 rounded-full bg-[var(--color-cream)] border border-[var(--color-rule)] text-[var(--color-navy)] flex items-center justify-center hover:bg-[var(--color-gold-light)]/30"
            aria-label="Increase"
          >
            <Plus size={24} />
          </button>
        </div>

        {/* Quick-tap shortcuts */}
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {[par - 2, par - 1, par, par + 1, par + 2, par + 3].filter((s) => s >= 1 && s <= 15).map((s) => (
            <button
              key={s}
              onClick={() => setStrokes(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-mono border ${
                s === strokes
                  ? "bg-[var(--color-navy)] text-[var(--color-cream)] border-[var(--color-navy)]"
                  : "bg-transparent border-[var(--color-rule)] text-[var(--color-navy)]"
              }`}
            >
              {s === par - 2 ? "eagle" : s === par - 1 ? "birdie" : s === par ? "par" : s === par + 1 ? "bogey" : `+${s - par}`}{" "}
              ({s})
            </button>
          ))}
        </div>

        {error && (
          <div className="text-xs text-[var(--color-oxblood)] mb-3 text-center">{error}</div>
        )}

        <Button
          onClick={commit}
          size="lg"
          variant="primary"
          className="w-full"
          disabled={saving || deleting}
        >
          {saving ? "Saving…" : "Save score"}
        </Button>

        {canDelete && (
          <button
            onClick={destroy}
            disabled={saving || deleting}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm font-ui uppercase tracking-[0.2em] text-[var(--color-oxblood)] disabled:opacity-50"
          >
            <Trash2 size={14} />
            {deleting ? "Deleting…" : "Delete score"}
          </button>
        )}
      </div>
    </div>
  );
}
