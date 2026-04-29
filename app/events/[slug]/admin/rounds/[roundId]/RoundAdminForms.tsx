"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PlayerRow } from "@/lib/types";

const fieldStyle: React.CSSProperties = {
  fontSize: 15,
  background: "var(--color-cream)",
  border: "1px solid var(--color-rule-cream)",
  color: "var(--color-navy)",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span
        className="font-ui uppercase"
        style={{
          fontSize: 10,
          letterSpacing: "0.24em",
          color: "var(--color-gold)",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

export function MatchForm({
  slug,
  roundId,
  unmatched,
}: {
  slug: string;
  roundId: string;
  unmatched: PlayerRow[];
}) {
  const router = useRouter();
  const [p1, setP1] = useState(unmatched[0]?.id ?? "");
  const [p2, setP2] = useState(unmatched[1]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const p2Options = useMemo(
    () => unmatched.filter((p) => p.id !== p1),
    [unmatched, p1],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(
        `/api/events/${slug}/rounds/${roundId}/matches`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ player1_id: p1, player2_id: p2 }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Could not create match.");
        setBusy(false);
        return;
      }
      router.refresh();
      setBusy(false);
    } catch {
      setError("Network error. Try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <Field label="Player 1">
        <select
          required
          value={p1}
          onChange={(e) => setP1(e.target.value)}
          className="font-body-serif px-3 py-2 w-[220px]"
          style={fieldStyle}
        >
          {unmatched.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (HCP {p.handicap})
            </option>
          ))}
        </select>
      </Field>
      <Field label="Player 2">
        <select
          required
          value={p2}
          onChange={(e) => setP2(e.target.value)}
          className="font-body-serif px-3 py-2 w-[220px]"
          style={fieldStyle}
        >
          {p2Options.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (HCP {p.handicap})
            </option>
          ))}
        </select>
      </Field>
      <button
        type="submit"
        disabled={busy || !p1 || !p2 || p1 === p2}
        className="font-ui uppercase px-4 py-2.5"
        style={{
          fontSize: 10,
          letterSpacing: "0.28em",
          color: "var(--color-cream)",
          background: "var(--color-navy)",
          fontWeight: 600,
          opacity: busy || !p1 || !p2 || p1 === p2 ? 0.5 : 1,
        }}
      >
        {busy ? "Adding…" : "Add match"}
      </button>
      {error && (
        <div
          className="font-body-serif italic w-full"
          style={{ fontSize: 12, color: "var(--color-oxblood)" }}
        >
          {error}
        </div>
      )}
    </form>
  );
}

export function TeeGroupForm({
  slug,
  roundId,
  ungroupedMatches,
  ungroupedEntries,
  players,
  nextGroupNumber,
}: {
  slug: string;
  roundId: string;
  ungroupedMatches: { id: string; label: string }[];
  ungroupedEntries: { id: string; label: string }[];
  players: PlayerRow[];
  nextGroupNumber: number;
}) {
  const router = useRouter();
  const [time, setTime] = useState("");
  const [scorerId, setScorerId] = useState<string>("");
  const [pickedMatches, setPickedMatches] = useState<string[]>([]);
  const [pickedEntries, setPickedEntries] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string, list: string[], set: (xs: string[]) => void) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(
        `/api/events/${slug}/rounds/${roundId}/tee-groups`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduled_time: time || undefined,
            scorer_player_id: scorerId || undefined,
            match_ids: pickedMatches.length ? pickedMatches : undefined,
            scramble_entry_ids: pickedEntries.length ? pickedEntries : undefined,
          }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Could not create group.");
        setBusy(false);
        return;
      }
      setTime("");
      setScorerId("");
      setPickedMatches([]);
      setPickedEntries([]);
      router.refresh();
      setBusy(false);
    } catch {
      setError("Network error. Try again.");
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 p-4"
      style={{
        border: "1px solid var(--color-rule-cream)",
        background: "rgba(0,0,0,0.015)",
      }}
    >
      <div
        className="font-ui uppercase flex items-baseline justify-between"
        style={{
          fontSize: 10,
          letterSpacing: "0.24em",
          color: "var(--color-navy)",
          fontWeight: 600,
        }}
      >
        <span>New group · #{nextGroupNumber}</span>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Tee time">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="font-mono px-3 py-2"
            style={fieldStyle}
          />
        </Field>
        <Field label="Designated scorer">
          <select
            value={scorerId}
            onChange={(e) => setScorerId(e.target.value)}
            className="font-body-serif px-3 py-2 w-[220px]"
            style={fieldStyle}
          >
            <option value="">— None —</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {ungroupedMatches.length > 0 && (
        <div>
          <div
            className="font-ui uppercase mb-1.5"
            style={{
              fontSize: 10,
              letterSpacing: "0.24em",
              color: "var(--color-gold)",
              fontWeight: 600,
            }}
          >
            Matches in this group
          </div>
          <div className="flex flex-col gap-1">
            {ungroupedMatches.map((m) => (
              <label
                key={m.id}
                className="flex items-center gap-2 font-body-serif"
                style={{ fontSize: 14, color: "var(--color-navy)" }}
              >
                <input
                  type="checkbox"
                  checked={pickedMatches.includes(m.id)}
                  onChange={() =>
                    toggle(m.id, pickedMatches, setPickedMatches)
                  }
                />
                <span>{m.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {ungroupedEntries.length > 0 && (
        <div>
          <div
            className="font-ui uppercase mb-1.5"
            style={{
              fontSize: 10,
              letterSpacing: "0.24em",
              color: "var(--color-gold)",
              fontWeight: 600,
            }}
          >
            Entries in this group
          </div>
          <div className="flex flex-col gap-1">
            {ungroupedEntries.map((e) => (
              <label
                key={e.id}
                className="flex items-center gap-2 font-body-serif"
                style={{ fontSize: 14, color: "var(--color-navy)" }}
              >
                <input
                  type="checkbox"
                  checked={pickedEntries.includes(e.id)}
                  onChange={() =>
                    toggle(e.id, pickedEntries, setPickedEntries)
                  }
                />
                <span>{e.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="font-ui uppercase self-start px-4 py-2.5"
        style={{
          fontSize: 10,
          letterSpacing: "0.28em",
          color: "var(--color-cream)",
          background: "var(--color-navy)",
          fontWeight: 600,
          opacity: busy ? 0.5 : 1,
        }}
      >
        {busy ? "Creating…" : "Create group"}
      </button>
      {error && (
        <div
          className="font-body-serif italic"
          style={{ fontSize: 12, color: "var(--color-oxblood)" }}
        >
          {error}
        </div>
      )}
    </form>
  );
}

export function ScorerSelect({
  slug,
  groupId,
  players,
  currentScorerId,
}: {
  slug: string;
  groupId: string;
  players: PlayerRow[];
  currentScorerId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (busy) return;
    const value = e.target.value || null;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${slug}/tee-groups/${groupId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scorer_player_id: value }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Could not change scorer.");
        setBusy(false);
        return;
      }
      router.refresh();
      setBusy(false);
    } catch {
      setError("Network error. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        value={currentScorerId ?? ""}
        onChange={onChange}
        disabled={busy}
        className="font-body-serif px-3 py-1.5"
        style={{
          fontSize: 13,
          background: "var(--color-cream)",
          border: "1px solid var(--color-rule-cream)",
          color: "var(--color-navy)",
          opacity: busy ? 0.6 : 1,
        }}
      >
        <option value="">— Scorer: none —</option>
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            Scorer: {p.name}
          </option>
        ))}
      </select>
      {error && (
        <span
          className="font-body-serif italic"
          style={{ fontSize: 11, color: "var(--color-oxblood)" }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
