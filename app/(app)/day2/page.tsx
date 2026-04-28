import Link from "next/link";
import { getRoundByDay } from "@/lib/repo/rounds";
import {
  listParticipantsForEntry,
  listScrambleEntries,
} from "@/lib/repo/scores";
import { listPlayers, listTeams } from "@/lib/repo/players";
import { computeDay2PoolRankRows } from "@/lib/repo/standings";
import { PageHero } from "@/components/layout/PageHero";

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
    <div className="paper-grain">
      <PageHero
        eyebrow={`DAY II · ${round.course_name.toUpperCase()}`}
        title="Two-man scramble"
        subtitle="Pools AD & BC. Pick yours."
      />

      <div className="mx-auto max-w-3xl px-4 pt-2 pb-6">
        {(["AD", "BC"] as const).map((pool) => (
          <div key={pool} className="mt-4">
            <div className="eyebrow">Pool {pool}</div>
            <div className="rule-gold mt-1.5 mb-1" />
            {pools[pool]
              .map((e) => ({ e, r: rankByEntry.get(e.id) }))
              .sort((a, b) => (a.r?.rank_in_pool ?? 99) - (b.r?.rank_in_pool ?? 99))
              .map(({ e, r }) => {
                const team = teams.get(e.team_id);
                const names = listParticipantsForEntry(e.id)
                  .map((p) => players.get(p.player_id)?.name)
                  .filter(Boolean);
                return (
                  <Link
                    key={e.id}
                    href={`/day2/entries/${e.id}`}
                    className="grid items-center gap-3 py-3"
                    style={{
                      gridTemplateColumns: "20px 1fr 60px 50px",
                      borderBottom: "1px solid var(--color-rule-cream)",
                    }}
                  >
                    <span className="font-mono text-[13px] text-[var(--color-navy)]">
                      {r?.rank_in_pool ?? "—"}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: team?.display_color }}
                        />
                        <span className="font-display text-[16px] text-[var(--color-navy)] truncate">
                          {names.length > 0 ? names.join(" + ") : team?.name}
                        </span>
                      </div>
                      {names.length > 0 && (
                        <div className="font-body-serif italic text-[11px] text-[var(--color-stone)] mt-0.5">
                          {team?.name}
                        </div>
                      )}
                    </div>
                    <span className="font-mono text-[14px] text-right text-[var(--color-navy)] tabular-nums">
                      {r ? r.team_raw : "—"}
                    </span>
                    <span className="font-mono text-[11px] text-right text-[var(--color-stone)] tabular-nums">
                      {r ? `thru ${r.holes_thru}` : "—"}
                    </span>
                  </Link>
                );
              })}
          </div>
        ))}

        <div className="pt-8 text-center">
          <div className="rule-gold mb-2" style={{ opacity: 0.4 }} />
          <div className="eyebrow-stone" style={{ fontSize: 8 }}>
            BEST BALL OF THE PAIR · NET
          </div>
        </div>
      </div>
    </div>
  );
}
