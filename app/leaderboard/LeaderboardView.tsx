"use client";

import { useEffect, useState } from "react";
import { useLiveRefresh } from "@/lib/client/useLiveRefresh";
import type {
  Day1IndividualRow,
  Day2EntryDisplayRow,
  Day3EntryDisplayRow,
  LeaderboardRow,
  PlayerRow,
  RoundRow,
} from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { toRoman } from "@/lib/utils";

type Props = {
  overall: LeaderboardRow[];
  day1: Day1IndividualRow[];
  day2: Day2EntryDisplayRow[];
  day3: Day3EntryDisplayRow[];
  rounds: RoundRow[];
  playersByTeam: Record<string, PlayerRow[]>;
};

type TabKey = "overall" | "day1" | "day2" | "day3";

const TAB_LABELS: Record<TabKey, string> = {
  overall: "Overall",
  day1: "Day I",
  day2: "Day II",
  day3: "Day III",
};

export function LeaderboardView({
  overall: overallInit,
  day1: day1Init,
  day2: day2Init,
  day3: day3Init,
  rounds,
  playersByTeam,
}: Props) {
  useLiveRefresh(["hole_scores", "rounds"]);
  const [overall, setOverall] = useState(overallInit);
  const [day1, setDay1] = useState(day1Init);
  const [day2, setDay2] = useState(day2Init);
  const [day3, setDay3] = useState(day3Init);
  const [tab, setTab] = useState<TabKey>("overall");

  useEffect(() => setOverall(overallInit), [overallInit]);
  useEffect(() => setDay1(day1Init), [day1Init]);
  useEffect(() => setDay2(day2Init), [day2Init]);
  useEffect(() => setDay3(day3Init), [day3Init]);

  const status = overall[0]?.status_label ?? "Upcoming";
  const isLive = status.startsWith("Live");

  return (
    <div>
      <div
        className="navy-grain text-[var(--color-cream)] px-4 pt-5 pb-4"
        style={{ borderBottom: "1px solid rgba(165,136,89,0.4)" }}
      >
        <div className="mx-auto max-w-3xl">
          <div className="eyebrow-cream" style={{ opacity: 0.85 }}>
            LEADERBOARD · YEAR V
          </div>
          <h1
            className="font-display mt-1.5"
            style={{ fontSize: 30, lineHeight: 1, color: "var(--color-cream)" }}
          >
            The Field
          </h1>
          <div className="mt-2 flex items-center justify-between">
            <div className="eyebrow-cream" style={{ opacity: 0.7, fontSize: 9 }}>
              {status.toUpperCase()}
            </div>
            {isLive && (
              <div
                className="pulse-live flex items-center gap-1.5"
                style={{
                  fontFamily: "var(--font-ui)",
                  fontWeight: 600,
                  fontSize: 9,
                  letterSpacing: "0.25em",
                  color: "var(--color-oxblood)",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: "var(--color-oxblood)",
                  }}
                />
                LIVE
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-4 space-y-4 paper-grain">
        <Tabs tab={tab} onChange={setTab} />

        {tab === "overall" && <OverallTab rows={overall} playersByTeam={playersByTeam} />}
        {tab === "day1" && <Day1Tab rows={day1} round={rounds.find((r) => r.day === 1)} />}
        {tab === "day2" && <Day2Tab rows={day2} round={rounds.find((r) => r.day === 2)} />}
        {tab === "day3" && <Day3Tab rows={day3} round={rounds.find((r) => r.day === 3)} />}
      </div>
    </div>
  );
}

function Tabs({ tab, onChange }: { tab: TabKey; onChange: (t: TabKey) => void }) {
  const keys: TabKey[] = ["overall", "day1", "day2", "day3"];
  return (
    <div className="flex border-b border-[var(--color-rule)]">
      {keys.map((k) => {
        const active = k === tab;
        return (
          <button
            key={k}
            onClick={() => onChange(k)}
            className={
              "flex-1 py-2 px-3 text-xs font-ui uppercase tracking-[0.2em] transition-all " +
              (active
                ? "text-[var(--color-navy)] border-b-2 border-[var(--color-gold)] -mb-px"
                : "text-neutral-500 hover:text-[var(--color-navy)]")
            }
          >
            {TAB_LABELS[k]}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Overall (team standings) ----------

function OverallTab({
  rows,
  playersByTeam,
}: {
  rows: LeaderboardRow[];
  playersByTeam: Record<string, PlayerRow[]>;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (rows.length === 0) {
    return <EmptyState message="Standings will appear here once the first hole is entered." />;
  }
  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const isOpen = expanded === row.team_id;
        const members = playersByTeam[row.team_id] ?? [];
        const captain = members.find((p) => p.team_slot === "A");
        const isLeader = row.rank === 1;
        return (
          <Card
            key={row.team_id}
            className="transition-all relative"
            style={isLeader ? { background: "rgba(165,136,89,0.08)" } : undefined}
          >
            {isLeader && (
              <span
                className="absolute left-0 top-0 bottom-0"
                style={{ width: 3, background: "var(--color-gold)" }}
              />
            )}
            <button
              onClick={() => setExpanded(isOpen ? null : row.team_id)}
              className="w-full text-left"
            >
              <CardContent className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xl w-9 text-center text-[var(--color-navy)]">
                    {toRoman(row.rank)}
                  </span>
                  <span
                    className="inline-block w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: row.display_color }}
                  />
                  <div>
                    <div className="font-display text-[20px] text-[var(--color-navy)]">
                      {row.name}
                    </div>
                    {captain && (
                      <div className="text-[11px] font-body-serif italic text-[var(--color-stone)]">
                        Captain · {captain.name}
                      </div>
                    )}
                    <div className="text-[11px] font-mono text-[var(--color-stone)] tabular-nums mt-0.5">
                      D·I {row.day1_points} · D·II {row.day2_points} · D·III{" "}
                      {row.day3_points || "—"}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-mono text-3xl text-[var(--color-navy)] tabular-nums">
                    {row.total_points}
                  </span>
                  {isOpen ? (
                    <ChevronUp size={16} className="text-[var(--color-stone)]" />
                  ) : (
                    <ChevronDown size={16} className="text-[var(--color-stone)]" />
                  )}
                </div>
              </CardContent>
            </button>
            {isOpen && (
              <div className="border-t border-[var(--color-rule)] px-4 py-3 space-y-2">
                <div className="text-xs font-ui uppercase tracking-[0.2em] text-[var(--color-gold)]">
                  Roster
                </div>
                <ul className="space-y-1 text-sm">
                  {members.map((p) => (
                    <li key={p.id} className="flex items-center justify-between">
                      <Link href={`/players/${p.id}`} className="hover:underline">
                        {p.name}{" "}
                        <span className="text-xs text-neutral-500">· HCP {p.handicap}</span>
                      </Link>
                      <span className="font-mono text-xs text-neutral-500">{p.team_slot}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/teams/${row.team_id}`}
                  className="inline-block mt-2 text-xs uppercase tracking-widest font-ui text-[var(--color-gold)]"
                >
                  View team →
                </Link>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ---------- Day 1 (singles match play, individual player rows) ----------

function Day1Tab({ rows, round }: { rows: Day1IndividualRow[]; round?: RoundRow }) {
  if (rows.length === 0) {
    return <EmptyState message="Day 1 leaderboard will appear once matches start." />;
  }
  const tieMap = countRanks(rows.map((r) => r.rank));
  return (
    <Card>
      <CourseHeader round={round} format="Singles · Net stroke play" />
      <div className="grid grid-cols-[2.5rem_1fr_3.5rem_3rem_5rem] items-center px-3 py-2 border-b border-[var(--color-rule)] text-[10px] font-ui uppercase tracking-[0.2em] text-neutral-500">
        <span>Pos</span>
        <span>Player</span>
        <span className="text-right">Score</span>
        <span className="text-right">Thru</span>
        <span className="text-right">Match</span>
      </div>
      <ul>
        {rows.map((r) => (
          <li
            key={r.player_id}
            className="grid grid-cols-[2.5rem_1fr_3.5rem_3rem_5rem] items-center px-3 py-2.5 border-b border-[var(--color-rule)] last:border-b-0"
          >
            <span className="font-mono text-sm text-[var(--color-navy)] tabular-nums">
              {formatRank(r.rank, tieMap.get(r.rank) ?? 1)}
            </span>
            <Link
              href={`/players/${r.player_id}`}
              className="flex items-center gap-2 min-w-0"
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: r.display_color }}
              />
              <span className="font-display text-base text-[var(--color-navy)] truncate">
                {r.player_name}
              </span>
            </Link>
            <span
              className={
                "font-mono text-base text-right tabular-nums " +
                scoreColor(r.score_to_par, r.holes_thru)
              }
            >
              {formatScore(r.score_to_par, r.holes_thru)}
            </span>
            <span className="font-mono text-sm text-right tabular-nums text-neutral-600">
              {formatThru(r.holes_thru)}
            </span>
            <span className="font-ui text-[11px] text-right text-neutral-600 tabular-nums">
              {formatMatchStatus(r)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ---------- Day 2 (2-man scrambles, AD + BC pools) ----------

function Day2Tab({ rows, round }: { rows: Day2EntryDisplayRow[]; round?: RoundRow }) {
  if (rows.length === 0) {
    return <EmptyState message="Day 2 leaderboard will appear once scramble play begins." />;
  }
  return (
    <div className="space-y-4">
      <PoolBoard
        rows={rows.filter((r) => r.pool === "AD")}
        round={round}
        label="Pool AD"
      />
      <PoolBoard
        rows={rows.filter((r) => r.pool === "BC")}
        round={round}
        label="Pool BC"
      />
    </div>
  );
}

function PoolBoard({
  rows,
  round,
  label,
}: {
  rows: Day2EntryDisplayRow[];
  round?: RoundRow;
  label: string;
}) {
  const sorted = [...rows].sort((a, b) => {
    if (a.holes_thru === 0 && b.holes_thru === 0)
      return a.team_name.localeCompare(b.team_name);
    if (a.holes_thru === 0) return 1;
    if (b.holes_thru === 0) return -1;
    return a.score_to_par - b.score_to_par;
  });
  if (sorted.length === 0) return null;
  return (
    <Card>
      <CourseHeader round={round} format={`${label} · 2-man scramble`} />
      <div className="grid grid-cols-[2.5rem_1fr_3.5rem_3rem_4rem] items-center px-3 py-2 border-b border-[var(--color-rule)] text-[10px] font-ui uppercase tracking-[0.2em] text-neutral-500">
        <span>Pos</span>
        <span>Pair</span>
        <span className="text-right">Score</span>
        <span className="text-right">Thru</span>
        <span className="text-right">Pts</span>
      </div>
      <ul>
        {sorted.map((r) => (
          <li
            key={r.entry_id}
            className="grid grid-cols-[2.5rem_1fr_3.5rem_3rem_4rem] items-center px-3 py-2.5 border-b border-[var(--color-rule)] last:border-b-0"
          >
            <span className="font-mono text-sm text-[var(--color-navy)] tabular-nums">
              {r.rank_in_pool}
            </span>
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: r.display_color }}
              />
              <div className="min-w-0">
                <div className="font-display text-base text-[var(--color-navy)] truncate">
                  {r.participant_names.length > 0 ? r.participant_names.join(" + ") : r.team_name}
                </div>
                {r.participant_names.length > 0 && (
                  <div className="text-[10px] font-ui text-neutral-500 truncate">
                    {r.team_name}
                  </div>
                )}
              </div>
            </div>
            <span
              className={
                "font-mono text-base text-right tabular-nums " +
                scoreColor(r.score_to_par, r.holes_thru)
              }
            >
              {formatScore(r.score_to_par, r.holes_thru)}
            </span>
            <span className="font-mono text-sm text-right tabular-nums text-neutral-600">
              {formatThru(r.holes_thru)}
            </span>
            <span className="font-mono text-sm text-right tabular-nums text-[var(--color-navy)]">
              {r.projected ? "—" : r.points}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ---------- Day 3 (4-man team scrambles) ----------

function Day3Tab({ rows, round }: { rows: Day3EntryDisplayRow[]; round?: RoundRow }) {
  if (rows.length === 0) {
    return <EmptyState message="Day 3 leaderboard will appear once the team scramble begins." />;
  }
  return (
    <Card>
      <CourseHeader round={round} format="Team scramble · 4-ball" />
      <div className="grid grid-cols-[2.5rem_1fr_3.5rem_3rem_4rem] items-center px-3 py-2 border-b border-[var(--color-rule)] text-[10px] font-ui uppercase tracking-[0.2em] text-neutral-500">
        <span>Pos</span>
        <span>Team</span>
        <span className="text-right">Score</span>
        <span className="text-right">Thru</span>
        <span className="text-right">Pts</span>
      </div>
      <ul>
        {rows.map((r) => (
          <li
            key={r.entry_id}
            className="grid grid-cols-[2.5rem_1fr_3.5rem_3rem_4rem] items-center px-3 py-2.5 border-b border-[var(--color-rule)] last:border-b-0"
          >
            <span className="font-mono text-sm text-[var(--color-navy)] tabular-nums">
              {r.holes_thru === 0 ? "—" : r.rank}
            </span>
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: r.display_color }}
              />
              <div className="min-w-0">
                <div className="font-display text-base text-[var(--color-navy)] truncate">
                  {r.team_name}
                </div>
                {r.participant_names.length > 0 && (
                  <div className="text-[10px] font-ui text-neutral-500 truncate">
                    {r.participant_names.join(" · ")}
                  </div>
                )}
              </div>
            </div>
            <span
              className={
                "font-mono text-base text-right tabular-nums " +
                scoreColor(r.score_to_par, r.holes_thru)
              }
            >
              {formatScore(r.score_to_par, r.holes_thru)}
            </span>
            <span className="font-mono text-sm text-right tabular-nums text-neutral-600">
              {formatThru(r.holes_thru)}
            </span>
            <span className="font-mono text-sm text-right tabular-nums text-[var(--color-navy)]">
              {r.projected ? "—" : r.total_points}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ---------- Shared helpers ----------

function CourseHeader({ round, format }: { round?: RoundRow; format: string }) {
  if (!round) return null;
  return (
    <div className="px-3 py-2.5 border-b border-[var(--color-rule)]">
      <div className="font-display text-sm text-[var(--color-navy)]">{round.course_name}</div>
      <div className="text-[10px] font-ui uppercase tracking-[0.2em] text-neutral-500">
        {format} · Par {round.total_par}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-10 text-center font-body-serif italic text-neutral-600">{message}</div>
  );
}

function formatScore(toPar: number, holesThru: number): string {
  if (holesThru === 0) return "—";
  if (toPar === 0) return "E";
  if (toPar < 0) return `${toPar}`;
  return `+${toPar}`;
}

function formatThru(holes: number): string {
  if (holes === 0) return "—";
  if (holes >= 18) return "F";
  return `${holes}`;
}

function scoreColor(toPar: number, holesThru: number): string {
  if (holesThru === 0) return "text-neutral-400";
  if (toPar < 0) return "text-[var(--color-oxblood)]";
  if (toPar > 0) return "text-neutral-700";
  return "text-[var(--color-navy)]";
}

function countRanks(ranks: number[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  return counts;
}

function formatRank(rank: number, sharedCount: number): string {
  if (rank === 0) return "—";
  return sharedCount > 1 ? `T${rank}` : `${rank}`;
}

function formatMatchStatus(r: Day1IndividualRow): string {
  if (r.match_status === "final") {
    if (r.is_winner === true) return "Won";
    if (r.is_winner === false) return "Lost";
    return "Halved";
  }
  if (r.match_status === "in_progress") {
    if (r.net_diff > 0) return `−${r.net_diff} net`;
    if (r.net_diff < 0) return `+${Math.abs(r.net_diff)} net`;
    return "Tied";
  }
  return `vs ${r.opponent_name}`;
}
