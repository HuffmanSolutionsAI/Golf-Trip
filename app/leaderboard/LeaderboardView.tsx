"use client";

import { useEffect, useState } from "react";
import { useLiveRefresh } from "@/lib/client/useLiveRefresh";
import type { LeaderboardRow, PlayerRow } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

type Props = {
  rows: LeaderboardRow[];
  playersByTeam: Record<string, PlayerRow[]>;
};

export function LeaderboardView({ rows: initial, playersByTeam }: Props) {
  const [rows, setRows] = useState(initial);
  const [expanded, setExpanded] = useState<string | null>(null);
  useLiveRefresh(["hole_scores", "rounds"]);

  useEffect(() => setRows(initial), [initial]);

  if (rows.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center font-body-serif italic text-neutral-600">
        Standings will appear here once the first hole is entered.
      </div>
    );
  }

  const status = rows[0]?.status_label ?? "Upcoming";

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="eyebrow">Leaderboard</div>
          <h1 className="font-display text-3xl text-[var(--color-navy)]">Team standings</h1>
        </div>
        <span className="font-ui text-[10px] tracking-[0.3em] uppercase text-neutral-600">
          {status}
        </span>
      </div>

      <div className="space-y-3">
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
                      <div className="font-display text-lg text-[var(--color-navy)]">{row.name}</div>
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
                      <li key={p.id} className="flex items-center justify-between">
                        <Link
                          href={`/players/${p.id}`}
                          className="hover:underline"
                        >
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
    </div>
  );
}
