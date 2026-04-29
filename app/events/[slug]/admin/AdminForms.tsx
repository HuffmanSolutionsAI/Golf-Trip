"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CourseRow, PlayerRow, TeamRow } from "@/lib/types";
import { listFormats } from "@/lib/formats/registry";

const fieldStyle: React.CSSProperties = {
  fontSize: 15,
  background: "var(--color-cream)",
  border: "1px solid var(--color-rule-cream)",
  color: "var(--color-navy)",
};

const COLOR_PRESETS = [
  "#a55a48",
  "#48725a",
  "#3a4762",
  "#a58859",
  "#7a5a86",
  "#5a7c84",
  "#86603a",
  "#5e3a3a",
];

export function TeamForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${slug}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, display_color: color }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Could not add team.");
        setBusy(false);
        return;
      }
      setName("");
      setColor(COLOR_PRESETS[0]);
      router.refresh();
      setBusy(false);
    } catch {
      setError("Network error. Try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1.5 min-w-[200px] flex-1">
        <span
          className="font-ui uppercase"
          style={{
            fontSize: 10,
            letterSpacing: "0.24em",
            color: "var(--color-gold)",
            fontWeight: 600,
          }}
        >
          Team name
        </span>
        <input
          type="text"
          required
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tribe Eight"
          className="font-body-serif px-3 py-2"
          style={fieldStyle}
        />
      </label>
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
          Color
        </span>
        <div className="flex items-center gap-1.5 py-1.5">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
              className="rounded-full"
              style={{
                width: 22,
                height: 22,
                background: c,
                border:
                  color === c
                    ? "2px solid var(--color-navy)"
                    : "1px solid var(--color-rule-cream)",
              }}
            />
          ))}
        </div>
      </label>
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
        {busy ? "Adding…" : "Add team"}
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

export function PlayerForm({
  slug,
  teams,
}: {
  slug: string;
  teams: TeamRow[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [handicap, setHandicap] = useState("");
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [slot, setSlot] = useState<"A" | "B" | "C" | "D">("A");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const hcp = Number(handicap);
    if (!Number.isFinite(hcp)) {
      setError("Handicap must be a number.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${slug}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          handicap: hcp,
          team_id: teamId,
          team_slot: slot,
          email: email || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Could not add player.");
        setBusy(false);
        return;
      }
      setName("");
      setHandicap("");
      setEmail("");
      // Bump slot to next vacant letter so adding 4 players in a row is fast.
      const next = { A: "B", B: "C", C: "D", D: "A" }[slot] as
        | "A"
        | "B"
        | "C"
        | "D";
      setSlot(next);
      router.refresh();
      setBusy(false);
    } catch {
      setError("Network error. Try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <Field label="Name">
        <input
          type="text"
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="font-body-serif px-3 py-2 w-[180px]"
          style={fieldStyle}
        />
      </Field>
      <Field label="Handicap">
        <input
          type="number"
          step="0.1"
          required
          value={handicap}
          onChange={(e) => setHandicap(e.target.value)}
          className="font-mono px-3 py-2 w-[90px]"
          style={fieldStyle}
        />
      </Field>
      <Field label="Team">
        <select
          required
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className="font-body-serif px-3 py-2 w-[180px]"
          style={fieldStyle}
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Slot">
        <select
          required
          value={slot}
          onChange={(e) => setSlot(e.target.value as "A" | "B" | "C" | "D")}
          className="font-mono px-3 py-2 w-[70px]"
          style={fieldStyle}
        >
          {(["A", "B", "C", "D"] as const).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Email (optional)">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="player@example.com"
          className="font-body-serif px-3 py-2 w-[220px]"
          style={fieldStyle}
        />
      </Field>
      <button
        type="submit"
        disabled={busy || !name || !handicap || !teamId}
        className="font-ui uppercase px-4 py-2.5"
        style={{
          fontSize: 10,
          letterSpacing: "0.28em",
          color: "var(--color-cream)",
          background: "var(--color-navy)",
          fontWeight: 600,
          opacity: busy || !name || !handicap || !teamId ? 0.5 : 1,
        }}
      >
        {busy ? "Adding…" : "Add player"}
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

export function RoundForm({
  slug,
  courses,
  usedDays,
}: {
  slug: string;
  courses: CourseRow[];
  usedDays: number[];
}) {
  const router = useRouter();
  const formats = listFormats();
  const freeDays = ([1, 2, 3] as const).filter((d) => !usedDays.includes(d));
  const [day, setDay] = useState<number>(freeDays[0] ?? 1);
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [formatId, setFormatId] = useState(formats[0]?.id ?? "match-play-net");
  const [date, setDate] = useState("");
  const [teeTime, setTeeTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${slug}/rounds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day,
          course_id: courseId,
          format_id: formatId,
          date,
          tee_time: teeTime,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Could not add round.");
        setBusy(false);
        return;
      }
      // Reset to next free day for fast successive adds.
      const justUsed = new Set([...usedDays, day]);
      const nextFree = ([1, 2, 3] as const).find((d) => !justUsed.has(d));
      if (nextFree) setDay(nextFree);
      setDate("");
      setTeeTime("");
      router.refresh();
      setBusy(false);
    } catch {
      setError("Network error. Try again.");
      setBusy(false);
    }
  }

  const selectedFormat = formats.find((f) => f.id === formatId);

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <Field label="Day">
        <select
          required
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          className="font-mono px-3 py-2 w-[80px]"
          style={fieldStyle}
        >
          {freeDays.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Course">
        <select
          required
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="font-body-serif px-3 py-2 w-[260px]"
          style={fieldStyle}
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · par {c.total_par}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Format">
        <select
          required
          value={formatId}
          onChange={(e) => setFormatId(e.target.value as typeof formatId)}
          className="font-body-serif px-3 py-2 w-[220px]"
          style={fieldStyle}
        >
          {formats.map((f) => (
            <option key={f.id} value={f.id}>
              {f.display_name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Date">
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="font-mono px-3 py-2"
          style={fieldStyle}
        />
      </Field>
      <Field label="Tee time">
        <input
          type="time"
          required
          value={teeTime}
          onChange={(e) => setTeeTime(e.target.value)}
          className="font-mono px-3 py-2 w-[120px]"
          style={fieldStyle}
        />
      </Field>
      <button
        type="submit"
        disabled={busy || !courseId || !date || !teeTime}
        className="font-ui uppercase px-4 py-2.5"
        style={{
          fontSize: 10,
          letterSpacing: "0.28em",
          color: "var(--color-cream)",
          background: "var(--color-navy)",
          fontWeight: 600,
          opacity: busy || !courseId || !date || !teeTime ? 0.5 : 1,
        }}
      >
        {busy ? "Adding…" : "Add round"}
      </button>
      {selectedFormat && (
        <p
          className="font-body-serif italic w-full mt-1"
          style={{
            fontSize: 12,
            color: "var(--color-stone)",
            opacity: 0.75,
          }}
        >
          {selectedFormat.blurb}
        </p>
      )}
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

export function AutoFillButton({
  slug,
  roundId,
}: {
  slug: string;
  roundId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(
        `/api/events/${slug}/rounds/${roundId}/auto-fill`,
        { method: "POST" },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Could not auto-fill.");
        setBusy(false);
        return;
      }
      // body.skipped[] tells us whether teams were dropped; surface it
      // briefly so the commissioner knows to top up the roster.
      if (Array.isArray(body.skipped) && body.skipped.length > 0) {
        const names = body.skipped.map((s: { team: string }) => s.team).join(", ");
        setError(
          `Filled ${body.entries_created} entries. Skipped: ${names} (${body.skipped[0].reason}).`,
        );
      }
      router.refresh();
      setBusy(false);
    } catch {
      setError("Network error. Try again.");
      setBusy(false);
    }
  }

  return (
    <span className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="font-ui uppercase px-3 py-1.5"
        style={{
          fontSize: 9,
          letterSpacing: "0.24em",
          color: "var(--color-cream)",
          background: "var(--color-navy)",
          fontWeight: 600,
          opacity: busy ? 0.5 : 1,
        }}
      >
        {busy ? "Filling…" : "Auto-fill"}
      </button>
      {error && (
        <span
          className="font-body-serif italic text-right"
          style={{ fontSize: 11, color: "var(--color-oxblood)", maxWidth: 240 }}
        >
          {error}
        </span>
      )}
    </span>
  );
}

export function RoleInviteForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"commissioner" | "scorer" | "player">(
    "commissioner",
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<
    { kind: "ok" | "err"; text: string } | null
  >(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${slug}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ kind: "err", text: body.error ?? "Could not invite." });
        setBusy(false);
        return;
      }
      setMessage({ kind: "ok", text: `Invited ${email} as ${role}.` });
      setEmail("");
      router.refresh();
      setBusy(false);
    } catch {
      setMessage({ kind: "err", text: "Network error. Try again." });
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <Field label="Email">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="them@example.com"
          className="font-body-serif px-3 py-2 w-[260px]"
          style={fieldStyle}
        />
      </Field>
      <Field label="Role">
        <select
          value={role}
          onChange={(e) =>
            setRole(e.target.value as "commissioner" | "scorer" | "player")
          }
          className="font-body-serif px-3 py-2 w-[160px]"
          style={fieldStyle}
        >
          <option value="commissioner">Co-commissioner</option>
          <option value="scorer">Scorer</option>
          <option value="player">Player</option>
        </select>
      </Field>
      <button
        type="submit"
        disabled={busy || !email}
        className="font-ui uppercase px-4 py-2.5"
        style={{
          fontSize: 10,
          letterSpacing: "0.28em",
          color: "var(--color-cream)",
          background: "var(--color-navy)",
          fontWeight: 600,
          opacity: busy || !email ? 0.5 : 1,
        }}
      >
        {busy ? "Sending…" : "Send invite"}
      </button>
      {message && (
        <div
          className="font-body-serif italic w-full"
          style={{
            fontSize: 12,
            color:
              message.kind === "ok"
                ? "var(--color-stone)"
                : "var(--color-oxblood)",
          }}
        >
          {message.text}
        </div>
      )}
    </form>
  );
}

export function RevokeRoleButton({
  slug,
  userId,
}: {
  slug: string;
  userId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (busy) return;
    if (!confirm("Revoke this role?")) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${slug}/roles/${userId}`, {
        method: "DELETE",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Could not revoke.");
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
        className="font-ui uppercase px-2 py-1"
        title="Revoke"
        style={{
          fontSize: 10,
          letterSpacing: "0.22em",
          color: "var(--color-stone)",
          border: "1px solid var(--color-rule-cream)",
          background: "transparent",
          opacity: busy ? 0.5 : 1,
        }}
      >
        {busy ? "…" : "Revoke"}
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

// ---------------------------------------------------------------------------
// Inline edit / delete (Plan A · Phase 3h)
// ---------------------------------------------------------------------------

export function TeamRow({
  slug,
  team,
  sortOrder,
}: {
  slug: string;
  team: TeamRow;
  sortOrder: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name);
  const [color, setColor] = useState(team.display_color);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${slug}/teams/${team.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, display_color: color }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Could not save.");
        setBusy(false);
        return;
      }
      setEditing(false);
      router.refresh();
      setBusy(false);
    } catch {
      setError("Network error.");
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <form
        onSubmit={save}
        className="grid items-center gap-2 py-2.5"
        style={{
          gridTemplateColumns: "20px minmax(0,1fr) auto auto",
          borderBottom: "1px solid var(--color-rule-cream)",
        }}
      >
        <span
          className="inline-block rounded-full"
          style={{ width: 12, height: 12, background: color }}
        />
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            required
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="font-body-serif px-2 py-1 flex-1 min-w-[120px]"
            style={fieldStyle}
          />
          <div className="flex items-center gap-1.5">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                className="rounded-full"
                style={{
                  width: 18,
                  height: 18,
                  background: c,
                  border:
                    color === c
                      ? "2px solid var(--color-navy)"
                      : "1px solid var(--color-rule-cream)",
                }}
              />
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="font-ui uppercase px-2 py-1"
          style={{
            fontSize: 9,
            letterSpacing: "0.22em",
            color: "var(--color-cream)",
            background: "var(--color-navy)",
            fontWeight: 600,
            opacity: busy ? 0.5 : 1,
          }}
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setName(team.name);
            setColor(team.display_color);
            setError(null);
          }}
          className="font-ui uppercase px-2 py-1"
          style={{
            fontSize: 9,
            letterSpacing: "0.22em",
            color: "var(--color-stone)",
            border: "1px solid var(--color-rule-cream)",
            background: "transparent",
          }}
        >
          Cancel
        </button>
        {error && (
          <div
            className="font-body-serif italic"
            style={{
              fontSize: 11,
              color: "var(--color-oxblood)",
              gridColumn: "1 / -1",
            }}
          >
            {error}
          </div>
        )}
      </form>
    );
  }

  return (
    <div
      className="grid items-center py-2.5"
      style={{
        gridTemplateColumns: "20px minmax(0,1fr) 60px auto",
        borderBottom: "1px solid var(--color-rule-cream)",
      }}
    >
      <span
        className="inline-block rounded-full"
        style={{ width: 12, height: 12, background: team.display_color }}
      />
      <span
        className="font-display text-[var(--color-navy)] truncate"
        style={{ fontSize: 18 }}
      >
        {team.name}
      </span>
      <span
        className="font-mono text-right"
        style={{ fontSize: 11, color: "var(--color-stone)" }}
      >
        #{sortOrder}
      </span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="font-ui uppercase px-2 py-1"
        style={{
          fontSize: 9,
          letterSpacing: "0.22em",
          color: "var(--color-stone)",
          border: "1px solid var(--color-rule-cream)",
          background: "transparent",
        }}
      >
        Edit
      </button>
    </div>
  );
}

export function PlayerRow({
  slug,
  player,
  teams,
}: {
  slug: string;
  player: PlayerRow;
  teams: TeamRow[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(player.name);
  const [handicap, setHandicap] = useState(String(player.handicap));
  const [email, setEmail] = useState(player.email ?? "");
  const [teamId, setTeamId] = useState(player.team_id);
  const [slot, setSlot] = useState(player.team_slot);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const hcp = Number(handicap);
    if (!Number.isFinite(hcp)) {
      setError("Handicap must be a number.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${slug}/players/${player.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          handicap: hcp,
          email,
          team_id: teamId,
          team_slot: slot,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Could not save.");
        setBusy(false);
        return;
      }
      setEditing(false);
      router.refresh();
      setBusy(false);
    } catch {
      setError("Network error.");
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <form
        onSubmit={save}
        className="flex flex-wrap items-end gap-2 py-2"
        style={{ borderBottom: "1px solid var(--color-rule-cream)" }}
      >
        <Field label="Name">
          <input
            type="text"
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="font-body-serif px-2 py-1 w-[160px]"
            style={fieldStyle}
          />
        </Field>
        <Field label="HCP">
          <input
            type="number"
            step="0.1"
            required
            value={handicap}
            onChange={(e) => setHandicap(e.target.value)}
            className="font-mono px-2 py-1 w-[80px]"
            style={fieldStyle}
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="—"
            className="font-body-serif px-2 py-1 w-[200px]"
            style={fieldStyle}
          />
        </Field>
        <Field label="Team">
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="font-body-serif px-2 py-1 w-[160px]"
            style={fieldStyle}
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Slot">
          <select
            value={slot}
            onChange={(e) => setSlot(e.target.value as "A" | "B" | "C" | "D")}
            className="font-mono px-2 py-1 w-[60px]"
            style={fieldStyle}
          >
            {(["A", "B", "C", "D"] as const).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <button
          type="submit"
          disabled={busy}
          className="font-ui uppercase px-3 py-1.5"
          style={{
            fontSize: 9,
            letterSpacing: "0.22em",
            color: "var(--color-cream)",
            background: "var(--color-navy)",
            fontWeight: 600,
            opacity: busy ? 0.5 : 1,
          }}
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setName(player.name);
            setHandicap(String(player.handicap));
            setEmail(player.email ?? "");
            setTeamId(player.team_id);
            setSlot(player.team_slot);
            setError(null);
          }}
          className="font-ui uppercase px-3 py-1.5"
          style={{
            fontSize: 9,
            letterSpacing: "0.22em",
            color: "var(--color-stone)",
            border: "1px solid var(--color-rule-cream)",
            background: "transparent",
          }}
        >
          Cancel
        </button>
        {error && (
          <div
            className="font-body-serif italic w-full"
            style={{ fontSize: 11, color: "var(--color-oxblood)" }}
          >
            {error}
          </div>
        )}
      </form>
    );
  }

  return (
    <div
      className="grid items-center py-2"
      style={{
        gridTemplateColumns: "30px minmax(0,1fr) 64px auto",
        borderBottom: "1px solid var(--color-rule-cream)",
      }}
    >
      <span
        className="font-ui uppercase"
        style={{
          fontSize: 10,
          letterSpacing: "0.22em",
          color: "var(--color-gold)",
          fontWeight: 600,
        }}
      >
        {player.team_slot}
      </span>
      <span
        className="font-display text-[var(--color-navy)] truncate"
        style={{ fontSize: 17 }}
      >
        {player.name}
        {player.email && (
          <span
            className="font-body-serif italic ml-2"
            style={{ fontSize: 12, color: "var(--color-stone)" }}
          >
            {player.email}
          </span>
        )}
      </span>
      <span
        className="font-mono text-right"
        style={{ fontSize: 11, color: "var(--color-stone)" }}
      >
        HCP {player.handicap}
      </span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="font-ui uppercase px-2 py-1"
        style={{
          fontSize: 9,
          letterSpacing: "0.22em",
          color: "var(--color-stone)",
          border: "1px solid var(--color-rule-cream)",
          background: "transparent",
        }}
      >
        Edit
      </button>
    </div>
  );
}

export function MatchDeleteButton({
  slug,
  roundId,
  matchId,
}: {
  slug: string;
  roundId: string;
  matchId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (busy) return;
    if (!confirm("Delete this match?")) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(
        `/api/events/${slug}/rounds/${roundId}/matches/${matchId}`,
        { method: "DELETE" },
      );
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
        title="Delete match"
        className="font-ui uppercase px-2 py-1"
        style={{
          fontSize: 9,
          letterSpacing: "0.22em",
          color: "var(--color-stone)",
          border: "1px solid var(--color-rule-cream)",
          background: "transparent",
          opacity: busy ? 0.5 : 1,
        }}
      >
        ✕
      </button>
      {error && (
        <span
          className="font-body-serif italic mt-1 text-right"
          style={{
            fontSize: 11,
            color: "var(--color-oxblood)",
            maxWidth: 240,
          }}
        >
          {error}
        </span>
      )}
    </span>
  );
}

export function TeeGroupDeleteButton({
  slug,
  groupId,
}: {
  slug: string;
  groupId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (busy) return;
    if (
      !confirm(
        "Delete this tee group? Members go back to ungrouped (matches/entries are kept).",
      )
    )
      return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${slug}/tee-groups/${groupId}`, {
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
        title="Delete group"
        className="font-ui uppercase px-2 py-1"
        style={{
          fontSize: 9,
          letterSpacing: "0.22em",
          color: "var(--color-stone)",
          border: "1px solid var(--color-rule-cream)",
          background: "transparent",
          opacity: busy ? 0.5 : 1,
        }}
      >
        ✕
      </button>
      {error && (
        <span
          className="font-body-serif italic mt-1 text-right"
          style={{ fontSize: 11, color: "var(--color-oxblood)" }}
        >
          {error}
        </span>
      )}
    </span>
  );
}

export function TeeGroupTimeInput({
  slug,
  groupId,
  current,
}: {
  slug: string;
  groupId: string;
  current: string | null;
}) {
  const router = useRouter();
  const [time, setTime] = useState(current ? current.slice(0, 5) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (busy) return;
    if (time === (current?.slice(0, 5) ?? "")) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${slug}/tee-groups/${groupId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_time: time || null }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Could not save.");
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
    <span className="flex flex-col">
      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        onBlur={save}
        disabled={busy}
        className="font-mono px-2 py-1"
        style={{
          fontSize: 13,
          background: "var(--color-cream)",
          border: "1px solid var(--color-rule-cream)",
          color: "var(--color-navy)",
          opacity: busy ? 0.5 : 1,
          width: 120,
        }}
      />
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

