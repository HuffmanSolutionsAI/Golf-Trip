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
  // Optional explicit event id for SSE subscription. Existing top-level
  // /leaderboard route omits it (server defaults to event-1); event-scoped
  // pages under /events/<slug>/leaderboard pass the slug so the view
  // subscribes to its own event's change stream.
  eventId?: string;
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
  eventId,
}: Props) {
  useLiveRefresh(["hole_scores", "rounds"], eventId);
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
        className="paper-grain"
        style={{ borderBottom: "1px solid var(--color-gold)" }}
      >
        <div className="mx-auto max-w-[1280px] px-5 md:px-8 py-12 md:py-16">
          <div
            className="font-ui uppercase"
            style={{
              fontSize: 11,
              letterSpacing: "0.32em",
              color: "var(--color-gold)",
              fontWeight: 500,
            }}
          >
            LIVE · OVERALL
          </div>
          <h1
            className="font-display text-[var(--color-navy)] mt-3"
            style={{
              fontSize: 56,
              lineHeight: 1,
              letterSpacing: "-0.01em",
            }}
          >
            The Field
          </h1>
          <div className="mt-3.5 flex items-center justify-between gap-3">
            <p
              className="font-body-serif italic"
              style={{
                fontSize: 17,
                color: "var(--color-stone)",
                opacity: 0.7,
                lineHeight: 1.55,
              }}
            >
              {status} · Updated on the half hour.
            </p>
            {isLive && (
              <div
                className="pulse-live flex items-center gap-1.5 shrink-0"
                style={{
                  fontFamily: "var(--font-ui)",
                  fontWeight: 600,
                  fontSize: 10,
                  letterSpacing: "0.28em",
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

      <div className="mx-auto max-w-[1100px] px-5 md:px-8 py-6 md:py-10 paper-grain">
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
  if (rows.length === 0) {
    return (
      <EmptyState message="Standings will appear here once the first hole is entered." />
    );
  }
  return (
    <div>
      <div
        className="grid items-center px-3 py-2.5 grid-cols-[40px_minmax(0,1fr)_60px] md:grid-cols-[60px_minmax(0,2fr)_60px_60px_60px_100px]"
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 10,
          letterSpacing: "0.22em",
          color: "var(--color-stone)",
          fontWeight: 500,
          textTransform: "uppercase",
          borderBottom: "1px solid var(--color-rule)",
        }}
      >
        <span>Pos</span>
        <span>Team</span>
        <span className="hidden md:block text-right">D·I</span>
        <span className="hidden md:block text-right">D·II</span>
        <span className="hidden md:block text-right">D·III</span>
        <span className="text-right">Pts</span>
      </div>
      {rows.map((row) => {
        const isLeader = row.rank === 1;
        const members = playersByTeam[row.team_id] ?? [];
        const memberNames = members
          .slice()
          .sort((a, b) => a.team_slot.localeCompare(b.team_slot))
          .map((p) => p.name);
        return (
          <Link
            key={row.team_id}
            href={`/teams/${row.team_id}`}
            className="grid items-center px-3 py-5 relative grid-cols-[40px_minmax(0,1fr)_60px] md:grid-cols-[60px_minmax(0,2fr)_60px_60px_60px_100px]"
            style={{
              borderBottom: "1px solid var(--color-rule-cream)",
              background: isLeader
                ? "rgba(165,136,89,0.08)"
                : "transparent",
            }}
          >
            {isLeader && (
              <span
                className="absolute left-0 top-0 bottom-0"
                style={{ width: 3, background: "var(--color-gold)" }}
              />
            )}
            <span
              className="font-mono pl-2 md:pl-3"
              style={{
                fontSize: 22,
                color: "var(--color-navy)",
              }}
            >
              {row.rank}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <span
                  className="inline-block rounded-full shrink-0"
                  style={{
                    width: 10,
                    height: 10,
                    background: row.display_color,
                  }}
                />
                <span
                  className="font-display text-[var(--color-navy)] truncate text-[22px] md:text-[26px]"
                >
                  {row.name}
                </span>
              </div>
              <div
                className="font-body-serif italic mt-1.5 truncate"
                style={{ fontSize: 12, color: "var(--color-stone)" }}
              >
                {memberNames.join(" · ")}
              </div>
              <div
                className="md:hidden font-mono mt-1"
                style={{ fontSize: 11, color: "var(--color-stone)" }}
              >
                D·I {row.day1_points} · D·II {row.day2_points} · D·III{" "}
                {row.day3_points || "—"}
              </div>
            </div>
            <span
              className="hidden md:block font-mono text-right"
              style={{ fontSize: 16, color: "var(--color-navy)" }}
            >
              {row.day1_points}
            </span>
            <span
              className="hidden md:block font-mono text-right"
              style={{ fontSize: 16, color: "var(--color-navy)" }}
            >
              {row.day2_points}
            </span>
            <span
              className="hidden md:block font-mono text-right"
              style={{ fontSize: 16, color: "var(--color-stone)" }}
            >
              {row.day3_points || "—"}
            </span>
            <span
              className="font-mono text-right text-[26px] md:text-[32px]"
              style={{ color: "var(--color-navy)" }}
            >
              {row.total_points}
            </span>
          </Link>
        );
      })}
      <div className="text-center pt-5 pb-2">
        <span className="eyebrow-stone" style={{ fontSize: 9 }}>
          UPDATED ON THE HALF HOUR
        </span>
      </div>
    </div>
  );
}

// ---------- Day 1 (singles net stroke play, individual player rows) ----------

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
