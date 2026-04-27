import Link from "next/link";
import { getRoundByDay } from "@/lib/repo/rounds";
import {
  listParticipantsForEntry,
  listScrambleEntries,
} from "@/lib/repo/scores";
import { listPlayers, listTeams } from "@/lib/repo/players";
import { computeDay3StandingRows } from "@/lib/repo/standings";
import { Card, CardContent } from "@/components/ui/card";

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
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      <div>
        <div className="eyebrow">Day 3 · Hyland</div>
        <h1 className="font-display text-3xl text-[var(--color-navy)]">
          4-man team scramble
        </h1>
      </div>

      <div className="space-y-2">
        {sorted.map((e) => {
          const s = standByEntry.get(e.id);
          const team = teams.get(e.team_id);
          const names = listParticipantsForEntry(e.id)
            .map((p) => players.get(p.player_id)?.name)
            .filter(Boolean)
            .join(" / ");
          return (
            <Link key={e.id} href={`/day3/entries/${e.id}`}>
              <Card className="hover:border-[var(--color-gold)] transition-colors">
                <CardContent className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-lg w-6 text-center">
                      {s?.rank ?? "—"}
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
                    {s
                      ? `${s.team_raw} · thru ${s.holes_thru} · ${s.total_points} pt`
                      : "—"}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
