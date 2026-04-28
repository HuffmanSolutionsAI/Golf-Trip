import Link from "next/link";
import { getRoundByDay } from "@/lib/repo/rounds";
import {
  listParticipantsForEntry,
  listScrambleEntries,
} from "@/lib/repo/scores";
import { listPlayers, listTeams } from "@/lib/repo/players";
import { computeDay2EntryLeaderboard } from "@/lib/repo/standings";

export const dynamic = "force-dynamic";

function fmt(n: number): string {
  if (n === 0) return "E";
  if (n < 0) return `${n}`;
  return `+${n}`;
}

function sc(n: number): string {
  if (n < 0) return "var(--color-oxblood)";
  if (n > 0) return "var(--color-stone)";
  return "var(--color-navy)";
}

export default function Day2IndexPage() {
  const round = getRoundByDay(2);
  if (!round) return null;

  const entries = listScrambleEntries(round.id);
  const ranks = computeDay2EntryLeaderboard();
  const teams = new Map(listTeams().map((t) => [t.id, t]));
  const players = new Map(listPlayers().map((p) => [p.id, p]));
  const rankByEntry = new Map(ranks.map((r) => [r.entry_id, r]));

  const pools: Record<"AD" | "BC", typeof entries> = { AD: [], BC: [] };
  for (const e of entries) if (e.pool === "AD" || e.pool === "BC") pools[e.pool].push(e);

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
            DAY II · {round.course_name.toUpperCase()}
          </div>
          <h1
            className="font-display text-[var(--color-navy)] mt-3"
            style={{
              fontSize: 56,
              lineHeight: 1,
              letterSpacing: "-0.01em",
            }}
          >
            Two-man scramble.
          </h1>
          <p
            className="font-body-serif italic mt-4"
            style={{
              fontSize: 17,
              color: "var(--color-stone)",
              opacity: 0.7,
              lineHeight: 1.55,
              maxWidth: 540,
            }}
          >
            Pools AD &amp; BC. Best ball of the pair, gross to par.
          </p>
        </div>
      </div>

      <div className="paper-grain">
        <div className="mx-auto max-w-[1100px] px-5 md:px-8 py-8 md:py-12">
          <div className="grid md:grid-cols-2 gap-10 md:gap-12">
            {(["AD", "BC"] as const).map((pool) => (
              <div key={pool}>
                <div
                  className="flex items-baseline justify-between pb-2.5 mb-2"
                  style={{ borderBottom: "1px solid var(--color-gold)" }}
                >
                  <div
                    className="font-display text-[var(--color-navy)]"
                    style={{ fontSize: 34 }}
                  >
                    Pool {pool}
                  </div>
                  <span
                    className="eyebrow-stone"
                    style={{ fontSize: 9 }}
                  >
                    {pools[pool].length} pairs
                  </span>
                </div>
                {pools[pool]
                  .map((e) => ({ e, r: rankByEntry.get(e.id) }))
                  .sort((a, b) => (a.r?.rank_in_pool ?? 99) - (b.r?.rank_in_pool ?? 99))
                  .map(({ e, r }) => {
                    const team = teams.get(e.team_id);
                    const names = listParticipantsForEntry(e.id)
                      .map((p) => players.get(p.player_id)?.name)
                      .filter(Boolean) as string[];
                    const toPar = r ? r.score_to_par : 0;
                    const thru = r?.holes_thru ?? 0;
                    return (
                      <Link
                        key={e.id}
                        href={`/day2/entries/${e.id}`}
                        className="grid items-center gap-2.5 py-3.5"
                        style={{
                          gridTemplateColumns: "24px minmax(0,1fr) 60px 50px",
                          borderBottom: "1px solid var(--color-rule-cream)",
                        }}
                      >
                        <span
                          className="font-mono"
                          style={{
                            fontSize: 14,
                            color: "var(--color-stone)",
                          }}
                        >
                          {r?.rank_in_pool ?? "—"}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block rounded-full shrink-0"
                              style={{
                                width: 8,
                                height: 8,
                                background: team?.display_color,
                              }}
                            />
                            <span
                              className="font-display text-[var(--color-navy)] truncate"
                              style={{ fontSize: 19 }}
                            >
                              {names.length > 0 ? names.join(" & ") : team?.name}
                            </span>
                          </div>
                          {names.length > 0 && (
                            <div
                              className="font-body-serif italic mt-1 truncate"
                              style={{
                                fontSize: 12,
                                color: "var(--color-stone)",
                              }}
                            >
                              {team?.name}
                            </div>
                          )}
                        </div>
                        <span
                          className="font-mono text-right"
                          style={{
                            fontSize: 20,
                            color: thru === 0 ? "var(--color-stone)" : sc(toPar),
                          }}
                        >
                          {thru === 0 ? "—" : fmt(toPar)}
                        </span>
                        <span
                          className="font-mono text-right"
                          style={{
                            fontSize: 11,
                            color: "var(--color-stone)",
                          }}
                        >
                          {thru === 0 ? "—" : `thru ${thru}`}
                        </span>
                      </Link>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
