import Link from "next/link";
import { getRoundByDay } from "@/lib/repo/rounds";
import {
  listParticipantsForEntry,
  listScrambleEntries,
} from "@/lib/repo/scores";
import { listPlayers, listTeams } from "@/lib/repo/players";
import { computeDay3StandingRows } from "@/lib/repo/standings";
import { PageHero } from "@/components/layout/PageHero";

export const dynamic = "force-dynamic";

export default function Day3IndexPage() {
  const round = getRoundByDay(3);
  if (!round) return null;

  const entries = listScrambleEntries(round.id);
  const standings = computeDay3StandingRows();
  const teams = new Map(listTeams().map((t) => [t.id, t]));
  const players = new Map(listPlayers().map((p) => [p.id, p]));
  const standByEntry = new Map(standings.map((s) => [s.entry_id, s]));

  const sorted = [...entries].sort(
    (a, b) => (standByEntry.get(a.id)?.rank ?? 99) - (standByEntry.get(b.id)?.rank ?? 99),
  );

  return (
    <div className="paper-grain">
      <PageHero
        eyebrow={`DAY III · ${round.course_name.toUpperCase()}`}
        title="The team scramble"
        subtitle="Four men. One ball. The Cup is decided."
      />

      <div className="mx-auto max-w-3xl px-4 py-4">
        <div className="eyebrow">Up next · 10:00 a.m.</div>
        <div className="rule-gold mt-1.5 mb-1" />
        {sorted.map((e) => {
          const s = standByEntry.get(e.id);
          const team = teams.get(e.team_id);
          const names = listParticipantsForEntry(e.id)
            .map((p) => players.get(p.player_id)?.name)
            .filter(Boolean) as string[];
          return (
            <Link
              key={e.id}
              href={`/day3/entries/${e.id}`}
              className="block py-4"
              style={{ borderBottom: "1px solid var(--color-rule-cream)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-[13px] text-[var(--color-stone)] w-4">
                    {s?.rank ?? "—"}
                  </span>
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: team?.display_color }}
                  />
                  <span className="font-display text-[18px] text-[var(--color-navy)]">
                    {team?.name}
                  </span>
                </div>
                <span className="font-mono text-[12px] text-[var(--color-stone)] tabular-nums">
                  {s ? `${s.team_raw} · thru ${s.holes_thru}` : "—"}
                </span>
              </div>
              <div
                className="font-body-serif italic text-[12px] text-[var(--color-stone)] mt-1.5"
                style={{ marginLeft: 30 }}
              >
                {names.join(" · ")}
              </div>
            </Link>
          );
        })}

        <div className="pt-8 pb-2 text-center">
          <div
            className="divider-stars font-ui font-semibold"
            style={{ fontSize: 8, letterSpacing: "0.32em" }}
          >
            <span>FOR THE STAPLETON CUP</span>
          </div>
        </div>
      </div>
    </div>
  );
}
