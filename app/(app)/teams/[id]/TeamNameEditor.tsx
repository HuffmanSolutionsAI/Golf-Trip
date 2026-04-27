"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

type Props = {
  teamId: string;
  initialName: string;
  canEdit: boolean;
};

export function TeamNameEditor({ teamId, initialName, canEdit }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!canEdit) {
    return <h1 className="font-display text-3xl text-[var(--color-navy)]">{initialName}</h1>;
  }

  if (!editing) {
    return (
      <button
        onClick={() => {
          setEditing(true);
          setError(null);
        }}
        className="group flex items-center gap-2 text-left"
      >
        <h1 className="font-display text-3xl text-[var(--color-navy)]">{initialName}</h1>
        <Pencil
          size={14}
          className="text-neutral-400 group-hover:text-[var(--color-gold)] transition-colors"
        />
      </button>
    );
  }

  async function save() {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setError("Name can't be empty.");
      return;
    }
    if (trimmed === initialName) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/team/name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, name: trimmed }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Could not save.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") {
            setEditing(false);
            setName(initialName);
            setError(null);
          }
        }}
        autoFocus
        maxLength={40}
        disabled={saving}
        className="font-display text-3xl text-[var(--color-navy)] bg-transparent border-b-2 border-[var(--color-gold)] focus:outline-none px-1 min-w-0 flex-1"
      />
      <button
        onClick={save}
        disabled={saving}
        className="text-xs uppercase tracking-widest font-ui text-[var(--color-gold)] disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
      <button
        onClick={() => {
          setEditing(false);
          setName(initialName);
          setError(null);
        }}
        disabled={saving}
        className="text-xs uppercase tracking-widest font-ui text-neutral-500"
      >
        Cancel
      </button>
      {error && <p className="basis-full text-xs text-[var(--color-oxblood)]">{error}</p>}
    </div>
  );
}
