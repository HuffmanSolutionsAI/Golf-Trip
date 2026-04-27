"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  Day1PlayerLeaderboardRow,
  Day2EntryLeaderboardRow,
  Day3EntryLeaderboardRow,
  LeaderboardRow,
  PlayerRow,
} from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type Tab = "overall" | "day1" | "day2" | "day3";

type Props = {
  overall: LeaderboardRow[];
  day1: Day1PlayerLeaderboardRow[];
  day2: Day2EntryLeaderboardRow[];
  day3: Day3EntryLeaderboardRow[];
  playersByTeam: Record<string, PlayerRow[]>;
};

const TABS: { key: Tab; label: string }[] = [
  { key: "day1", label: "Day 1" },
  { key: "day2", label: "Day 2" },
  { key: "day3", label: "Day 3" },
  { key: "overall", label: "Overall" },
];

export function LeaderboardView({
  overall,
  day1,
  day2,
  day3,
  playersByTeam,
}: Props) {
  const [tab, setTab] = useState<Tab>(defaultTab(day1, day2, day3));
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("leaderboard-scores")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hole_scores" },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rounds" },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      <div>
        <div className="eyebrow">Leaderboard</div>
        <h1 className="font-display text-3xl text-[var(--color-navy)]">
          {tabHeading(tab)}
        </h1>
      </div>

      <TabBar tab={tab} onChange={setTab} />

      {tab === "overall" && (
        <OverallBoard rows={overall} playersByTeam={playersByTeam} />
      )}
      {tab === "day1" && <Day1Board rows={day1} />}
      {tab === "day2" && <Day2Board rows={day2} />}
      {tab === "day3" && <Day3Board rows={day3} />}
    </div>
  );
}

function tabHeading(tab: Tab): string {
  switch (tab) {
    case "overall":
      return "Team standings";
    case "day1":
      return "Day 1 · Singles";
    case "day2":
      return "Day 2 · 2-man scramble";
    case "day3":
      return "Day 3 · 4-man scramble";
  }
}

function defaultTab(
  day1: Day1PlayerLeaderboardRow[],
  day2: Day2EntryLeaderboardRow[],
  day3: Day3EntryLeaderboardRow[],
): Tab {
  // Open the most recent day with any activity; fall back to Day 1.
  if (day3.some((r) => r.holes_thru > 0)) return "day3";
  if (day2.some((r) => r.holes_thru > 0)) return "day2";
  if (day1.some((r) => r.holes_thru > 0)) return "day1";
  return "day1";
}

function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <div
      role="tablist"
      className="flex border-b border-[var(--color-rule)] -mx-1"
    >
      {TABS.map((t) => {
        const active = t.key === tab;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={cn(
              "flex-1 px-2 py-2 text-xs font-ui uppercase tracking-[0.2em] transition-colors",
              active
                ? "text-[var(--color-navy)] border-b-2 border-[var(--color-gold)]"
                : "text-neutral-500 border-b-2 border-transparent hover:text-[var(--color-navy)]",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function HeaderRow({ columns }: { columns: string[] }) {
  return (
    <div className="grid grid-cols-[2.25rem_1fr_3rem_3rem_3.5rem] gap-2 px-3 py-2 text-[10px] font-ui uppercase tracking-[0.2em] text-neutral-500 border-b border-[var(--color-rule)]">
      <div>{columns[0]}</div>
      <div>{columns[1]}</div>
      <div className="text-right">{columns[2]}</div>
      <div className="text-right">{columns[3]}</div>
      <div className="text-right">{columns[4]}</div>
    </div>
  );
}

function ToParCell({
  toPar,
  holesThru,
}: {
  toPar: number;
  holesThru: number;
}) {
  if (holesThru === 0) {
    return <span className="text-neutral-400">—</span>;
  }
  if (toPar === 0) return <span className="text-[var(--color-navy)]">E</span>;
  if (toPar < 0)
    return (
      <span className="text-[var(--color-oxblood)] font-semibold">
        {toPar}
      </span>
    );
  return <span className="text-neutral-700">+{toPar}</span>;
}

function ThruCell({ holesThru }: { holesThru: number }) {
  if (holesThru === 0) return <span className="text-neutral-400">—</span>;
  if (holesThru >= 18)
    return (
      <span className="font-ui text-[10px] tracking-[0.2em] uppercase text-[var(--color-navy)]">
        F
      </span>
    );
  return <span className="tabular-nums">{holesThru}</span>;
}

function PosCell({ rank }: { rank: number }) {
  return (
    <span className="font-mono text-base tabular-nums text-[var(--color-navy)]">
      {rank}
    </span>
  );
}

function ColorDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{ backgroundColor: color }}
    />
  );
}

// ---------------------------------------------------------------------------
// Day 1 — singles, one row per player, score-to-par based on net.
// ---------------------------------------------------------------------------

function Day1Board({ rows }: { rows: Day1PlayerLeaderboardRow[] }) {
  if (rows.length === 0) return <EmptyBoard />;
  const sorted = [...rows].sort(byRankThenName);
  return (
    <Card className="overflow-hidden">
      <HeaderRow columns={["Pos", "Player", "To Par", "Thru", "Net"]} />
      <ul>
        {sorted.map((row) => (
          <li
            key={row.player_id}
            className="grid grid-cols-[2.25rem_1fr_3rem_3rem_3.5rem] gap-2 px-3 py-2 items-center border-b border-[var(--color-rule)] last:border-b-0"
          >
            <PosCell rank={row.rank} />
            <div className="flex items-center gap-2 min-w-0">
              <ColorDot color={row.display_color} />
              <Link
                href={`/players/${row.player_id}`}
                className="truncate font-ui text-sm text-[var(--color-navy)] hover:underline"
              >
                {row.player_name}
              </Link>
              <span className="text-[10px] font-ui text-neutral-500 truncate">
                {row.team_name}
              </span>
            </div>
            <div className="text-right font-mono text-sm tabular-nums">
              <ToParCell toPar={row.to_par} holesThru={row.holes_thru} />
            </div>
            <div className="text-right font-mono text-sm">
              <ThruCell holesThru={row.holes_thru} />
            </div>
            <div className="text-right font-mono text-sm tabular-nums text-neutral-700">
              {row.holes_thru === 0 ? "—" : row.net_thru}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Day 2 — 2-man scramble, one row per entry. Includes pool tag.
// ---------------------------------------------------------------------------

function Day2Board({ rows }: { rows: Day2EntryLeaderboardRow[] }) {
  if (rows.length === 0) return <EmptyBoard />;
  const sorted = [...rows].sort(byRankThenSort);
  return (
    <Card className="overflow-hidden">
      <HeaderRow columns={["Pos", "Entry", "To Par", "Thru", "Score"]} />
      <ul>
        {sorted.map((row) => (
          <li
            key={row.entry_id}
            className="grid grid-cols-[2.25rem_1fr_3rem_3rem_3.5rem] gap-2 px-3 py-2 items-center border-b border-[var(--color-rule)] last:border-b-0"
          >
            <PosCell rank={row.rank} />
            <div className="flex items-center gap-2 min-w-0">
              <ColorDot color={row.display_color} />
              <span className="truncate font-ui text-sm text-[var(--color-navy)]">
                {row.team_name}
              </span>
              <span className="text-[10px] font-ui uppercase tracking-[0.2em] text-[var(--color-gold)]">
                {row.pool}
              </span>
            </div>
            <div className="text-right font-mono text-sm tabular-nums">
              <ToParCell toPar={row.to_par} holesThru={row.holes_thru} />
            </div>
            <div className="text-right font-mono text-sm">
              <ThruCell holesThru={row.holes_thru} />
            </div>
            <div className="text-right font-mono text-sm tabular-nums text-neutral-700">
              {row.holes_thru === 0 ? "—" : row.gross}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Day 3 — 4-man scramble, one row per team.
// ---------------------------------------------------------------------------

function Day3Board({ rows }: { rows: Day3EntryLeaderboardRow[] }) {
  if (rows.length === 0) return <EmptyBoard />;
  const sorted = [...rows].sort(byRankThenSort);
  return (
    <Card className="overflow-hidden">
      <HeaderRow columns={["Pos", "Team", "To Par", "Thru", "Score"]} />
      <ul>
        {sorted.map((row) => (
          <li
            key={row.entry_id}
            className="grid grid-cols-[2.25rem_1fr_3rem_3rem_3.5rem] gap-2 px-3 py-2 items-center border-b border-[var(--color-rule)] last:border-b-0"
          >
            <PosCell rank={row.rank} />
            <div className="flex items-center gap-2 min-w-0">
              <ColorDot color={row.display_color} />
              <Link
                href={`/teams/${row.team_id}`}
                className="truncate font-ui text-sm text-[var(--color-navy)] hover:underline"
              >
                {row.team_name}
              </Link>
            </div>
            <div className="text-right font-mono text-sm tabular-nums">
              <ToParCell toPar={row.to_par} holesThru={row.holes_thru} />
            </div>
            <div className="text-right font-mono text-sm">
              <ThruCell holesThru={row.holes_thru} />
            </div>
            <div className="text-right font-mono text-sm tabular-nums text-neutral-700">
              {row.holes_thru === 0 ? "—" : row.gross}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Overall — aggregated team points across all three days.
// ---------------------------------------------------------------------------

function OverallBoard({
  rows,
  playersByTeam,
}: {
  rows: LeaderboardRow[];
  playersByTeam: Record<string, PlayerRow[]>;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const status = rows[0]?.status_label ?? "Upcoming";

  if (rows.length === 0) {
    return (
      <div className="text-center font-body-serif italic text-neutral-600 py-10">
        Standings will appear here once the first hole is entered.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <span className="font-ui text-[10px] tracking-[0.3em] uppercase text-neutral-600">
          {status}
        </span>
      </div>
      {rows.map((row) => {
        const isOpen = expanded === row.team_id;
        const members = playersByTeam[row.team_id] ?? [];
        const captain = members.find((p) => p.team_slot === "A");
        return (
          <Card key={row.team_id} className="transition-all">
            <button
              onClick={() => setExpanded(isOpen ? null : row.team_id)}
              className="w-full text-left"
            >
              <CardContent className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-2xl w-8 text-center text-[var(--color-navy)]">
                    {row.rank}
                  </span>
                  <span
                    className="inline-block w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: row.display_color }}
                  />
                  <div>
                    <div className="font-display text-lg text-[var(--color-navy)]">
                      {row.name}
                    </div>
                    {captain && (
                      <div className="text-xs font-ui text-neutral-600">
                        Captain: {captain.name}
                      </div>
                    )}
                    <div className="text-[11px] font-mono text-neutral-500 tabular-nums mt-0.5">
                      D1: {row.day1_points} · D2: {row.day2_points} · D3:{" "}
                      {row.day3_points || "—"}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-display text-3xl text-[var(--color-navy)] tabular-nums">
                    {row.total_points}
                  </span>
                  {isOpen ? (
                    <ChevronUp size={16} className="text-neutral-500" />
                  ) : (
                    <ChevronDown size={16} className="text-neutral-500" />
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
                    <li
                      key={p.id}
                      className="flex items-center justify-between"
                    >
                      <Link
                        href={`/players/${p.id}`}
                        className="hover:underline"
                      >
                        {p.name}{" "}
                        <span className="text-xs text-neutral-500">
                          · HCP {p.handicap}
                        </span>
                      </Link>
                      <span className="font-mono text-xs text-neutral-500">
                        {p.team_slot}
                      </span>
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

function EmptyBoard() {
  return (
    <Card>
      <CardContent className="text-center font-body-serif italic text-neutral-600">
        Standings will appear here once the first hole is entered.
      </CardContent>
    </Card>
  );
}

function byRankThenName(
  a: { rank: number; player_name?: string },
  b: { rank: number; player_name?: string },
) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  return (a.player_name ?? "").localeCompare(b.player_name ?? "");
}

function byRankThenSort(
  a: { rank: number; sort_order: number },
  b: { rank: number; sort_order: number },
) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  return a.sort_order - b.sort_order;
}

