import Link from "next/link";
import { listMatches } from "@/lib/repo/scores";
import { listPlayers, listTeams } from "@/lib/repo/players";
import { computeDay1MatchStates } from "@/lib/repo/standings";
import { getRoundByDay } from "@/lib/repo/rounds";
import { PageHero } from "@/components/layout/PageHero";
import { toRoman } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function Day1IndexPage() {
  const round = getRoundByDay(1);
  const matches = listMatches();
  const states = computeDay1MatchStates();
  const players = new Map(listPlayers().map((p) => [p.id, p]));
  const teams = new Map(listTeams().map((t) => [t.id, t]));
  const stateById = new Map(states.map((s) => [s.match_id, s]));

  return (
    <div className="paper-grain">
      <PageHero
        eyebrow={`DAY I · ${round?.course_name ?? "PINEWILD"}`}
        title="Singles · net stroke play"
        subtitle="Ten matches. Win the matchup, two points. A halve, one each."
      />

      <div className="mx-auto max-w-3xl px-4 py-4">
        {matches.map((m, idx) => {
          const state = stateById.get(m.id);
          const p1 = players.get(m.player1_id);
          const p2 = players.get(m.player2_id);
          const t1 = p1 ? teams.get(p1.team_id) : undefined;
          const t2 = p2 ? teams.get(p2.team_id) : undefined;
          const status =
            state?.status === "final"
              ? `${state.p1_total_net}–${state.p2_total_net}`
              : state?.status === "in_progress"
                ? `Thru ${state.holes_both_played}`
                : "Pending";
          const statusLabel =
            state?.status === "final"
              ? "Final"
              : state?.status === "in_progress"
                ? "Live"
                : "Pending";
          return (
            <Link
              key={m.id}
              href={`/day1/matches/${m.id}`}
              className="grid items-center gap-3 py-3.5"
              style={{
                gridTemplateColumns: "auto 1fr auto",
                borderTop: idx === 0 ? "1px solid var(--color-gold)" : 0,
                borderBottom: "1px solid var(--color-rule-cream)",
              }}
            >
              <span className="font-mono text-[13px] text-[var(--color-gold)] w-8">
                {toRoman(m.match_number)}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: t1?.display_color }}
                  />
                  <span className="font-display text-[16px] text-[var(--color-navy)]">
                    {p1?.name}
                  </span>
                  <span className="font-body-serif italic text-[var(--color-stone)] text-[12px]">
                    versus
                  </span>
                  <span className="font-display text-[16px] text-[var(--color-navy)]">
                    {p2?.name}
                  </span>
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: t2?.display_color }}
                  />
                </div>
                {m.stroke_giver_id != null && m.strokes_given > 0 && (
                  <div className="font-body-serif italic text-[11px] text-[var(--color-stone)] mt-0.5">
                    {(m.stroke_giver_id === m.player1_id ? p1?.name : p2?.name)} gets{" "}
                    {m.strokes_given}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="font-mono text-sm text-[var(--color-navy)] tabular-nums">
                  {status}
                </div>
                <div className="text-[8px] font-ui uppercase tracking-[0.25em] text-[var(--color-stone)] mt-0.5">
                  {statusLabel}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
