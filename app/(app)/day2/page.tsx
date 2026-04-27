import Link from "next/link";
import { getRoundByDay } from "@/lib/repo/rounds";
import {
  listParticipantsForEntry,
  listScrambleEntries,
} from "@/lib/repo/scores";
import { listPlayers, listTeams } from "@/lib/repo/players";
import { computeDay2PoolRankRows } from "@/lib/repo/standings";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function Day2IndexPage() {
  const round = getRoundByDay(2);
  if (!round) return null;

  const entries = listScrambleEntries(round.id);
  const ranks = computeDay2PoolRankRows();
  const teams = new Map(listTeams().map((t) => [t.id, t]));
  const players = new Map(listPlayers().map((p) => [p.id, p]));
  const rankByEntry = new Map(ranks.map((r) => [r.entry_id, r]));

  const pools: Record<"AD" | "BC", typeof entries> = { AD: [], BC: [] };
  for (const e of entries) if (e.pool === "AD" || e.pool === "BC") pools[e.pool].push(e);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div>
        <div className="eyebrow">Day 2 · Talamore</div>
        <h1 className="font-display text-3xl text-[var(--color-navy)]">
          2-man scramble · two pools
        </h1>
      </div>

      {(["AD", "BC"] as const).map((pool) => (
        <div key={pool} className="space-y-2">
          <div className="eyebrow">Pool {pool}</div>
          {pools[pool]
            .map((e) => ({ e, r: rankByEntry.get(e.id) }))
            .sort((a, b) => (a.r?.rank_in_pool ?? 99) - (b.r?.rank_in_pool ?? 99))
            .map(({ e, r }) => {
              const team = teams.get(e.team_id);
              const names = listParticipantsForEntry(e.id)
                .map((p) => players.get(p.player_id)?.name)
                .filter(Boolean)
                .join(" & ");
              return (
                <Link key={e.id} href={`/day2/entries/${e.id}`}>
                  <Card className="hover:border-[var(--color-gold)] transition-colors">
                    <CardContent className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-lg w-6 text-center">
                          {r?.rank_in_pool ?? "—"}
                        </span>
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ backgroundColor: team?.display_color }}
                        />
                        <div>
                          <div className="font-ui font-semibold">{team?.name}</div>
                          <div className="text-xs font-body-serif italic text-neutral-600">
                            {names}
                          </div>
                        </div>
                      </div>
                      <div className="font-mono tabular-nums text-sm text-right">
                        {r
                          ? `${r.team_raw} · thru ${r.holes_thru} · ${r.points} pt`
                          : "—"}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
        </div>
      ))}
    </div>
  );
}
