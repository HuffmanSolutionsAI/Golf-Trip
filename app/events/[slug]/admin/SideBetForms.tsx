"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PlayerRow, RoundRow, SideBetRow, TeamRow } from "@/lib/types";

const fieldStyle: React.CSSProperties = {
  fontSize: 15,
  background: "var(--color-cream)",
  border: "1px solid var(--color-rule-cream)",
  color: "var(--color-navy)",
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
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
      {hint && (
        <span
          className="font-body-serif italic"
          style={{ fontSize: 11, color: "var(--color-stone)" }}
        >
          {hint}
        </span>
      )}
    </label>
  );
}

function dollarsToCents(s: string): number {
  // Accept '20', '20.00', '$20'. Returns 0 for empty/invalid.
  const cleaned = s.replace(/[^0-9.]/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function SideBetCreateForm({
  slug,
  rounds,
}: {
  slug: string;
  rounds: RoundRow[];
}) {
  const router = useRouter();
  const [type, setType] = useState<"custom" | "skins">("custom");
  const [name, setName] = useState("");
  const [buyIn, setBuyIn] = useState("");
  const [roundId, setRoundId] = useState("");
  const [scoreType, setScoreType] = useState<"gross" | "net">("gross");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (type === "skins" && !roundId) {
      setError("Skins bets need a round.");
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        type,
        name,
        buy_in_cents: dollarsToCents(buyIn || "0"),
        round_id: roundId || undefined,
      };
      if (type === "skins") {
        body.rules = { score_type: scoreType };
      }
      const res = await fetch(`/api/events/${slug}/side-bets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not create bet.");
        setBusy(false);
        return;
      }
      setName("");
      setBuyIn("");
      setRoundId("");
      setType("custom");
      setScoreType("gross");
      router.refresh();
      setBusy(false);
    } catch {
      setError("Network error.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <Field label="Type">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as "custom" | "skins")}
          className="font-body-serif px-3 py-2 w-[140px]"
          style={fieldStyle}
        >
          <option value="custom">Custom</option>
          <option value="skins">Skins</option>
        </select>
      </Field>
      <Field label="Bet name">
        <input
          type="text"
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={type === "skins" ? "Skins · Day II" : "Closest to pin · 17"}
          className="font-body-serif px-3 py-2 w-[220px]"
          style={fieldStyle}
        />
      </Field>
      <Field label="Buy-in ($)">
        <input
          type="text"
          inputMode="decimal"
          value={buyIn}
          onChange={(e) => setBuyIn(e.target.value)}
          placeholder="20"
          className="font-mono px-3 py-2 w-[100px]"
          style={fieldStyle}
        />
      </Field>
      <Field
        label={type === "skins" ? "Round" : "Round (optional)"}
        hint={type === "skins" ? "Required for skins" : undefined}
      >
        <select
          required={type === "skins"}
          value={roundId}
          onChange={(e) => setRoundId(e.target.value)}
          className="font-body-serif px-3 py-2 w-[200px]"
          style={fieldStyle}
        >
          <option value="">{type === "skins" ? "— Pick a round —" : "Event-wide"}</option>
          {rounds.map((r) => (
            <option key={r.id} value={r.id}>
              Day {r.day} · {r.course_name}
            </option>
          ))}
        </select>
      </Field>
      {type === "skins" && (
        <Field label="Scoring">
          <select
            value={scoreType}
            onChange={(e) => setScoreType(e.target.value as "gross" | "net")}
            className="font-body-serif px-3 py-2 w-[120px]"
            style={fieldStyle}
          >
            <option value="gross">Gross</option>
            <option value="net">Net</option>
          </select>
        </Field>
      )}
      <button
        type="submit"
        disabled={busy || !name}
        className="font-ui uppercase px-4 py-2.5"
        style={{
          fontSize: 10,
          letterSpacing: "0.28em",
          color: "var(--color-cream)",
          background: "var(--color-navy)",
          fontWeight: 600,
          opacity: busy || !name ? 0.5 : 1,
        }}
      >
        {busy ? "Creating…" : "Create bet"}
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

export function SideBetParticipantManager({
  slug,
  bet,
  participants,
  rosterPlayers,
}: {
  slug: string;
  bet: SideBetRow;
  participants: { player_id: string }[];
  rosterPlayers: PlayerRow[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [pickedId, setPickedId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const already = new Set(participants.map((p) => p.player_id));
  const available = rosterPlayers.filter((p) => !already.has(p.id));

  async function add() {
    if (!pickedId) return;
    setError(null);
    setAdding(true);
    try {
      const res = await fetch(
        `/api/events/${slug}/side-bets/${bet.id}/entries`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ player_id: pickedId }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Could not add.");
        setAdding(false);
        return;
      }
      setPickedId("");
      router.refresh();
      setAdding(false);
    } catch {
      setError("Network error.");
      setAdding(false);
    }
  }

  async function remove(playerId: string) {
    setError(null);
    try {
      const res = await fetch(
        `/api/events/${slug}/side-bets/${bet.id}/entries`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ player_id: playerId }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Could not remove.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
    }
  }

  if (bet.status === "settled") {
    return (
      <div className="flex flex-wrap gap-1.5">
        {participants.map((e) => {
          const p = rosterPlayers.find((x) => x.id === e.player_id);
          return (
            <span
              key={e.player_id}
              className="font-body-serif"
              style={{
                fontSize: 13,
                color: "var(--color-stone)",
                padding: "2px 8px",
                border: "1px solid var(--color-rule-cream)",
              }}
            >
              {p?.name ?? "?"}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {participants.map((e) => {
          const p = rosterPlayers.find((x) => x.id === e.player_id);
          return (
            <span
              key={e.player_id}
              className="flex items-center gap-1.5 font-body-serif"
              style={{
                fontSize: 13,
                color: "var(--color-navy)",
                padding: "2px 8px",
                border: "1px solid var(--color-rule-cream)",
              }}
            >
              {p?.name ?? "?"}
              <button
                type="button"
                onClick={() => remove(e.player_id)}
                title="Remove"
                style={{
                  fontSize: 11,
                  color: "var(--color-oxblood)",
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </span>
          );
        })}
      </div>
      {available.length > 0 && (
        <div className="flex items-end gap-2">
          <select
            value={pickedId}
            onChange={(e) => setPickedId(e.target.value)}
            className="font-body-serif px-2 py-1.5 w-[200px]"
            style={fieldStyle}
            disabled={adding}
          >
            <option value="">— Add player —</option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={add}
            disabled={!pickedId || adding}
            className="font-ui uppercase px-3 py-1.5"
            style={{
              fontSize: 10,
              letterSpacing: "0.22em",
              color: "var(--color-cream)",
              background: "var(--color-navy)",
              fontWeight: 600,
              opacity: !pickedId || adding ? 0.5 : 1,
            }}
          >
            Add
          </button>
        </div>
      )}
      {error && (
        <div
          className="font-body-serif italic"
          style={{ fontSize: 11, color: "var(--color-oxblood)" }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

export function SideBetSettleButton({
  slug,
  bet,
  participants,
  rosterPlayers,
}: {
  slug: string;
  bet: SideBetRow;
  participants: { player_id: string }[];
  rosterPlayers: PlayerRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  type Row = { recipient_id: string; amount: string; note: string };
  const [rows, setRows] = useState<Row[]>(() =>
    participants.map((p) => ({
      recipient_id: p.player_id,
      amount: "",
      note: "",
    })),
  );
  const [computeBusy, setComputeBusy] = useState(false);
  const [computeMsg, setComputeMsg] = useState<string | null>(null);

  const pot = bet.buy_in_cents * participants.length;
  const totalCents = rows.reduce((sum, r) => sum + dollarsToCents(r.amount), 0);

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, j) => (i === j ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((rs) => [...rs, { recipient_id: "", amount: "", note: "" }]);
  }
  function removeRow(i: number) {
    setRows((rs) => rs.filter((_, j) => j !== i));
  }

  async function preFillFromScores() {
    if (computeBusy) return;
    setComputeMsg(null);
    setComputeBusy(true);
    try {
      const res = await fetch(
        `/api/events/${slug}/side-bets/${bet.id}/compute`,
        { method: "POST" },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setComputeMsg(body.error ?? "Could not compute.");
        setComputeBusy(false);
        return;
      }
      type Suggested = {
        recipient_player_id: string;
        amount_cents: number;
        note: string;
      };
      const suggested = body.payouts as Suggested[];
      setRows(
        suggested.map((p) => ({
          recipient_id: p.recipient_player_id,
          amount: (p.amount_cents / 100).toFixed(2),
          note: p.note,
        })),
      );
      const carry = body.carryover_remaining as number;
      const unalloc = body.unallocated_cents as number;
      const notes: string[] = [];
      if (carry > 0) notes.push(`${carry} skin${carry === 1 ? "" : "s"} carried over (no winner)`);
      if (unalloc > 0) notes.push(`$${(unalloc / 100).toFixed(2)} unallocated from rounding`);
      setComputeMsg(notes.length > 0 ? `Pre-filled. ${notes.join(" · ")}.` : "Pre-filled.");
      setComputeBusy(false);
    } catch {
      setComputeMsg("Network error.");
      setComputeBusy(false);
    }
  }

  async function settle() {
    setError(null);
    const payouts = rows
      .filter((r) => r.recipient_id && dollarsToCents(r.amount) > 0)
      .map((r) => ({
        recipient_player_id: r.recipient_id,
        amount_cents: dollarsToCents(r.amount),
        note: r.note || undefined,
      }));
    if (payouts.length === 0) {
      setError("Add at least one payout with a recipient and amount.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/events/${slug}/side-bets/${bet.id}/settle`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payouts }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Could not settle.");
        setBusy(false);
        return;
      }
      setOpen(false);
      router.refresh();
      setBusy(false);
    } catch {
      setError("Network error.");
      setBusy(false);
    }
  }

  if (bet.status === "settled") {
    return null;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={participants.length === 0}
        className="font-ui uppercase px-3 py-1.5"
        title={
          participants.length === 0
            ? "Add participants before settling"
            : "Settle bet"
        }
        style={{
          fontSize: 10,
          letterSpacing: "0.22em",
          color: "var(--color-cream)",
          background: "var(--color-navy)",
          fontWeight: 600,
          opacity: participants.length === 0 ? 0.5 : 1,
        }}
      >
        Settle
      </button>
    );
  }

  return (
    <div
      className="flex flex-col gap-3 p-4 mt-2 w-full"
      style={{
        border: "1px solid var(--color-gold)",
        background: "rgba(0,0,0,0.02)",
      }}
    >
      <div
        className="font-ui uppercase flex items-baseline justify-between"
        style={{
          fontSize: 11,
          letterSpacing: "0.24em",
          color: "var(--color-navy)",
          fontWeight: 600,
        }}
      >
        <span>Settle "{bet.name}"</span>
        <span style={{ color: "var(--color-stone)" }}>
          Pot ${centsToDollars(pot)} · payouts ${centsToDollars(totalCents)}
        </span>
      </div>
      {bet.type === "skins" && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={preFillFromScores}
            disabled={computeBusy}
            className="font-ui uppercase px-3 py-1.5"
            style={{
              fontSize: 10,
              letterSpacing: "0.22em",
              color: "var(--color-cream)",
              background: "var(--color-oxblood)",
              fontWeight: 600,
              opacity: computeBusy ? 0.5 : 1,
            }}
          >
            {computeBusy ? "Computing…" : "Pre-fill from scores"}
          </button>
          {computeMsg && (
            <span
              className="font-body-serif italic"
              style={{ fontSize: 12, color: "var(--color-stone)" }}
            >
              {computeMsg}
            </span>
          )}
        </div>
      )}
      {rows.map((row, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2">
          <Field label="Recipient">
            <select
              value={row.recipient_id}
              onChange={(e) =>
                updateRow(i, { recipient_id: e.target.value })
              }
              className="font-body-serif px-2 py-1.5 w-[200px]"
              style={fieldStyle}
            >
              <option value="">—</option>
              {rosterPlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount ($)">
            <input
              type="text"
              inputMode="decimal"
              value={row.amount}
              onChange={(e) => updateRow(i, { amount: e.target.value })}
              className="font-mono px-2 py-1.5 w-[100px]"
              style={fieldStyle}
              placeholder="0.00"
            />
          </Field>
          <Field label="Note">
            <input
              type="text"
              value={row.note}
              onChange={(e) => updateRow(i, { note: e.target.value })}
              className="font-body-serif px-2 py-1.5 w-[180px]"
              style={fieldStyle}
              placeholder="optional"
            />
          </Field>
          <button
            type="button"
            onClick={() => removeRow(i)}
            title="Remove row"
            className="font-ui uppercase px-2 py-1.5"
            style={{
              fontSize: 10,
              letterSpacing: "0.22em",
              color: "var(--color-stone)",
              border: "1px solid var(--color-rule-cream)",
              background: "transparent",
            }}
          >
            ✕
          </button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={addRow}
          className="font-ui uppercase px-3 py-1.5"
          style={{
            fontSize: 10,
            letterSpacing: "0.22em",
            color: "var(--color-stone)",
            border: "1px solid var(--color-rule-cream)",
            background: "transparent",
          }}
        >
          + Add row
        </button>
        <button
          type="button"
          onClick={settle}
          disabled={busy}
          className="font-ui uppercase px-4 py-2"
          style={{
            fontSize: 10,
            letterSpacing: "0.28em",
            color: "var(--color-cream)",
            background: "var(--color-navy)",
            fontWeight: 600,
            opacity: busy ? 0.5 : 1,
          }}
        >
          {busy ? "Settling…" : "Confirm settle"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="font-ui uppercase px-3 py-2"
          style={{
            fontSize: 10,
            letterSpacing: "0.22em",
            color: "var(--color-stone)",
            border: "1px solid var(--color-rule-cream)",
            background: "transparent",
          }}
        >
          Cancel
        </button>
      </div>
      {error && (
        <div
          className="font-body-serif italic"
          style={{ fontSize: 12, color: "var(--color-oxblood)" }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

export function SideBetDeleteButton({
  slug,
  bet,
}: {
  slug: string;
  bet: SideBetRow;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (busy) return;
    const msg =
      bet.status === "settled"
        ? `Delete settled bet "${bet.name}"? Payouts will be removed too.`
        : `Delete "${bet.name}"?`;
    if (!confirm(msg)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${slug}/side-bets/${bet.id}`, {
        method: "DELETE",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Could not delete.");
        setBusy(false);
        return;
      }
      router.refresh();
      setBusy(false);
    } catch {
      setError("Network error.");
      setBusy(false);
    }
  }

  return (
    <span className="flex flex-col items-end">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        title="Delete bet"
        className="font-ui uppercase px-2 py-1"
        style={{
          fontSize: 9,
          letterSpacing: "0.22em",
          color: "var(--color-oxblood)",
          border: "1px solid var(--color-rule-cream)",
          background: "transparent",
          opacity: busy ? 0.5 : 1,
        }}
      >
        ✕
      </button>
      {error && (
        <span
          className="font-body-serif italic mt-1"
          style={{ fontSize: 11, color: "var(--color-oxblood)" }}
        >
          {error}
        </span>
      )}
    </span>
  );
}

// re-export for convenience
export type { TeamRow };
