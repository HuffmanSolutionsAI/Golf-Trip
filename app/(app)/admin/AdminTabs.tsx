"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardEyebrow } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import type {
  AuditLogRow,
  HoleRow,
  PlayerRow,
  RoundRow,
  ScrambleEntryRow,
  TeamRow,
} from "@/lib/types";

type TeeGroupAdminRow = {
  id: string;
  round_id: string;
  group_number: number;
  scheduled_time: string | null;
  scorer_player_id: string | null;
  player_names: string[];
};

type Props = {
  players: (PlayerRow & { team: { name: string } | null })[];
  teams: TeamRow[];
  rounds: RoundRow[];
  holes: HoleRow[];
  entries: ScrambleEntryRow[];
  audit: AuditLogRow[];
  teeGroups: TeeGroupAdminRow[];
};

const TABS = [
  "Players",
  "Tee Times",
  "Holes",
  "Rounds",
  "Tiebreak",
  "Audit",
] as const;
type Tab = (typeof TABS)[number];

export function AdminTabs(props: Props) {
  const [tab, setTab] = useState<Tab>("Players");

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-4">
      <div>
        <div className="eyebrow">Admin</div>
        <h1 className="font-display text-3xl text-[var(--color-navy)]">Commissioner controls</h1>
      </div>

      <div className="flex gap-1 border-b border-[var(--color-rule)] overflow-x-auto scrollbar-hidden">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-ui uppercase tracking-[0.2em] font-semibold border-b-2 ${
              tab === t
                ? "border-[var(--color-gold)] text-[var(--color-navy)]"
                : "border-transparent text-neutral-600 hover:text-[var(--color-navy)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Players" && <PlayersTab players={props.players} />}
      {tab === "Tee Times" && (
        <TeeGroupsTab
          groups={props.teeGroups}
          rounds={props.rounds}
          players={props.players}
        />
      )}
      {tab === "Holes" && <HolesTab rounds={props.rounds} holes={props.holes} />}
      {tab === "Rounds" && <RoundsTab rounds={props.rounds} />}
      {tab === "Tiebreak" && <TiebreakTab rounds={props.rounds} entries={props.entries} teams={props.teams} />}
      {tab === "Audit" && <AuditTab rows={props.audit} />}
    </div>
  );
}

function TeeGroupsTab({
  groups,
  rounds,
  players,
}: {
  groups: TeeGroupAdminRow[];
  rounds: RoundRow[];
  players: (PlayerRow & { team: { name: string } | null })[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const playerOptions = [...players].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const groupsByRound = new Map<string, TeeGroupAdminRow[]>();
  for (const g of groups) {
    const arr = groupsByRound.get(g.round_id) ?? [];
    arr.push(g);
    groupsByRound.set(g.round_id, arr);
  }

  async function setScorer(teeGroupId: string, scorerPlayerId: string) {
    setSaving(teeGroupId);
    setError(null);
    const res = await fetch("/api/admin/tee-group-scorer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teeGroupId,
        scorerPlayerId: scorerPlayerId || null,
      }),
    });
    setSaving(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Save failed.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {rounds.map((r) => {
        const groupsForRound = (groupsByRound.get(r.id) ?? []).sort(
          (a, b) => a.group_number - b.group_number,
        );
        if (groupsForRound.length === 0) return null;
        return (
          <Card key={r.id}>
            <CardContent>
              <CardEyebrow>
                Day {r.day} · {r.course_name}
              </CardEyebrow>
              <table className="w-full text-sm mt-3">
                <thead>
                  <tr
                    className="text-left"
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 10,
                      letterSpacing: "0.22em",
                      color: "var(--color-stone)",
                      fontWeight: 500,
                      textTransform: "uppercase",
                    }}
                  >
                    <th className="py-2 pr-2">Tee</th>
                    <th className="py-2 pr-2">Time</th>
                    <th className="py-2 pr-2">Players</th>
                    <th className="py-2">Scorer</th>
                  </tr>
                </thead>
                <tbody>
                  {groupsForRound.map((g) => (
                    <tr
                      key={g.id}
                      style={{
                        borderTop: "1px solid var(--color-rule-cream)",
                      }}
                    >
                      <td className="py-3 pr-2 font-mono text-[var(--color-gold)]">
                        {romanize(g.group_number)}
                      </td>
                      <td className="py-3 pr-2 font-mono text-[var(--color-stone)]">
                        {g.scheduled_time
                          ? formatTeeClock(g.scheduled_time)
                          : "—"}
                      </td>
                      <td className="py-3 pr-2 font-body-serif italic text-[var(--color-ink)]">
                        {g.player_names.join(" · ")}
                      </td>
                      <td className="py-3">
                        <select
                          value={g.scorer_player_id ?? ""}
                          disabled={saving === g.id}
                          onChange={(e) => setScorer(g.id, e.target.value)}
                          className="bg-[var(--color-paper)] border border-[var(--color-rule)] px-2 py-1 text-sm font-ui"
                        >
                          <option value="">— None —</option>
                          {playerOptions.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        );
      })}
      {error && (
        <div className="text-sm text-[var(--color-oxblood)]">{error}</div>
      )}
    </div>
  );
}

function romanize(n: number): string {
  return ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][n - 1] ?? `${n}`;
}

function formatTeeClock(t: string): string {
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr, 10);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${mStr} ${suffix}`;
}

function PlayersTab({
  players,
}: {
  players: (PlayerRow & { team: { name: string } | null })[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  async function save(playerId: string, value: string) {
    const hcp = parseFloat(value);
    if (Number.isNaN(hcp)) return;
    setSaving(playerId);
    await fetch("/api/admin/handicap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, handicap: hcp }),
    });
    setSaving(null);
    router.refresh();
  }

  async function reseed() {
    await fetch("/api/admin/reseed-day1", { method: "POST" });
    router.refresh();
  }

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between mb-3">
          <CardEyebrow>Players</CardEyebrow>
          <Button size="sm" variant="secondary" onClick={reseed}>
            Re-seed Day 1 matches
          </Button>
        </div>
        <div className="overflow-hidden rounded-md border border-[var(--color-rule)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-navy)] text-[var(--color-cream)]">
              <tr>
                <th className="py-1.5 px-2 text-left text-xs font-ui">Name</th>
                <th className="py-1.5 px-2 text-left text-xs font-ui">Team</th>
                <th className="py-1.5 px-2 text-left text-xs font-ui">Slot</th>
                <th className="py-1.5 px-2 text-left text-xs font-ui">Handicap</th>
                <th className="py-1.5 px-2 text-left text-xs font-ui">Admin</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className="odd:bg-[var(--color-paper)]">
                  <td className="px-2 py-1.5">{p.name}</td>
                  <td className="px-2 py-1.5">{p.team?.name}</td>
                  <td className="px-2 py-1.5">{p.team_slot}</td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.1"
                        className="w-24"
                        defaultValue={p.handicap}
                        onChange={(e) =>
                          setEditing((s) => ({ ...s, [p.id]: e.target.value }))
                        }
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={saving === p.id}
                        onClick={() =>
                          save(p.id, editing[p.id] ?? String(p.handicap))
                        }
                      >
                        Save
                      </Button>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-xs text-neutral-600">
                    {p.is_admin ? "✓" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function HolesTab({
  rounds,
  holes,
}: {
  rounds: RoundRow[];
  holes: HoleRow[];
}) {
  const router = useRouter();
  const [activeRound, setActiveRound] = useState(rounds[0]?.id ?? "");
  const active = rounds.find((r) => r.id === activeRound);
  const roundHoles = holes
    .filter((h) => h.round_id === activeRound)
    .sort((a, b) => a.hole_number - b.hole_number);

  async function save(h: HoleRow, field: "par" | "handicap_index" | "yardage", value: string) {
    const payload: Record<string, unknown> = { holeId: h.id };
    if (field === "par") payload.par = parseInt(value, 10);
    else if (field === "handicap_index") payload.handicap_index = value === "" ? null : parseInt(value, 10);
    else payload.yardage = value === "" ? null : parseInt(value, 10);
    await fetch("/api/admin/hole", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    router.refresh();
  }

  return (
    <Card>
      <CardContent>
        <div className="mb-3 flex gap-2 flex-wrap">
          {rounds.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveRound(r.id)}
              className={`text-xs font-ui rounded px-3 py-1.5 ${
                activeRound === r.id
                  ? "bg-[var(--color-navy)] text-[var(--color-cream)]"
                  : "bg-[var(--color-cream)] text-[var(--color-navy)]"
              }`}
            >
              Day {r.day} · {r.course_name}
            </button>
          ))}
        </div>
        {active && (
          <>
            <CardEyebrow>Holes · {active.course_name}</CardEyebrow>
            <div className="overflow-hidden rounded-md border border-[var(--color-rule)] mt-2">
              <table className="w-full text-sm scorecard-cell">
                <thead className="bg-[var(--color-navy)] text-[var(--color-cream)]">
                  <tr>
                    <th className="py-1.5 px-2 text-left text-xs font-ui">H</th>
                    <th className="py-1.5 px-2 text-left text-xs font-ui">Par</th>
                    <th className="py-1.5 px-2 text-left text-xs font-ui">Hdcp Idx</th>
                    <th className="py-1.5 px-2 text-left text-xs font-ui">Yardage</th>
                  </tr>
                </thead>
                <tbody>
                  {roundHoles.map((h) => (
                    <tr key={h.id} className="odd:bg-[var(--color-paper)]">
                      <td className="px-2 py-1.5">{h.hole_number}</td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          className="w-16"
                          defaultValue={h.par}
                          onBlur={(e) => save(h, "par", e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          className="w-16"
                          defaultValue={h.handicap_index ?? ""}
                          onBlur={(e) => save(h, "handicap_index", e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          className="w-24"
                          defaultValue={h.yardage ?? ""}
                          onBlur={(e) => save(h, "yardage", e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-neutral-500 mt-2 font-body-serif italic">
              Day 1 stroke allocations re-compute automatically when you save.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function RoundsTab({ rounds }: { rounds: RoundRow[] }) {
  const router = useRouter();
  async function toggle(r: RoundRow) {
    await fetch("/api/admin/lock-round", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roundId: r.id, locked: !r.is_locked }),
    });
    router.refresh();
  }
  return (
    <Card>
      <CardContent>
        <CardEyebrow>Rounds</CardEyebrow>
        <ul className="mt-2 divide-y divide-[var(--color-rule)]">
          {rounds.map((r) => (
            <li key={r.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="font-ui font-semibold">
                  Day {r.day} · {r.course_name}
                </div>
                <div className="text-xs text-neutral-600">
                  {r.date} · {r.format} · par {r.total_par}
                </div>
              </div>
              <Button
                size="sm"
                variant={r.is_locked ? "destructive" : "secondary"}
                onClick={() => toggle(r)}
              >
                {r.is_locked ? "Unlock" : "Lock"}
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function TiebreakTab({
  rounds,
  entries,
  teams,
}: {
  rounds: RoundRow[];
  entries: ScrambleEntryRow[];
  teams: TeamRow[];
}) {
  const router = useRouter();
  const day2 = rounds.find((r) => r.day === 2);
  if (!day2)
    return <Card><CardContent>No Day 2 round.</CardContent></Card>;
  const day2Entries = entries.filter((e) => e.round_id === day2.id);
  const teamById = new Map(teams.map((t) => [t.id, t]));

  async function set(entryId: string, value: string) {
    const manualRank = value === "" ? null : parseInt(value, 10);
    await fetch("/api/admin/tiebreak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scrambleEntryId: entryId, manualRank }),
    });
    router.refresh();
  }

  return (
    <Card>
      <CardContent>
        <CardEyebrow>Day 2 · Manual tiebreak</CardEyebrow>
        <p className="font-body-serif italic text-neutral-600 text-sm mt-1">
          Leave blank for natural rank by raw score.
        </p>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          {day2Entries.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between gap-2 text-sm border border-[var(--color-rule)] rounded px-3 py-2"
            >
              <span>
                {teamById.get(e.team_id)?.name} · Pool {e.pool}
              </span>
              <Input
                type="number"
                min={1}
                max={5}
                className="w-16"
                defaultValue={e.manual_tiebreak_rank ?? ""}
                onBlur={(ev) => set(e.id, ev.target.value)}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AuditTab({ rows }: { rows: AuditLogRow[] }) {
  return (
    <Card>
      <CardContent>
        <CardEyebrow>Audit log (most recent 100)</CardEyebrow>
        {rows.length === 0 ? (
          <p className="font-body-serif italic text-neutral-600 text-sm mt-2">
            No entries yet.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-[var(--color-rule)] text-sm">
            {rows.map((r) => (
              <li key={r.id} className="py-2">
                <div className="flex items-center justify-between">
                  <span className="font-ui font-semibold">{r.action}</span>
                  <span className="text-xs text-neutral-500">
                    {formatDistanceToNow(new Date(r.occurred_at), { addSuffix: true })}
                  </span>
                </div>
                <div className="text-xs text-neutral-600 font-mono truncate">
                  {r.entity_type}:{r.entity_id?.slice(0, 8)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
