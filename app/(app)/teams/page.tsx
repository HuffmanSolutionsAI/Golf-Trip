import Link from "next/link";
import { listPlayers } from "@/lib/repo/players";
import { computeLeaderboard } from "@/lib/repo/standings";
import { Card, CardContent } from "@/components/ui/card";
import type { PlayerRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function TeamsIndexPage() {
  const lb = computeLeaderboard().sort((a, b) => a.sort_order - b.sort_order);
  const players = listPlayers();
  const byTeam = new Map<string, PlayerRow[]>();
  players.forEach((p) => {
    if (!byTeam.has(p.team_id)) byTeam.set(p.team_id, []);
    byTeam.get(p.team_id)!.push(p);
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      <div>
        <div className="eyebrow">Teams</div>
        <h1 className="font-display text-3xl text-[var(--color-navy)]">Five teams</h1>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        {lb.map((team) => {
          const members = byTeam.get(team.team_id) ?? [];
          return (
            <Link key={team.team_id} href={`/teams/${team.team_id}`} className="block">
              <Card className="hover:border-[var(--color-gold)] transition-colors">
                <div
                  className="h-1.5 rounded-t-lg"
                  style={{ backgroundColor: team.display_color }}
                />
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-display text-xl text-[var(--color-navy)]">
                      {team.name}
                    </div>
                    <div className="font-mono text-lg tabular-nums">
                      {team.total_points}{" "}
                      <span className="text-xs text-neutral-500">pts</span>
                    </div>
                  </div>
                  <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                    {members.map((p) => (
                      <li key={p.id} className="flex items-center gap-2">
                        <span className="inline-block w-4 h-4 rounded-full bg-[var(--color-navy)] text-[var(--color-cream)] text-[10px] font-ui font-semibold flex items-center justify-center">
                          {p.name[0]}
                        </span>
                        <span>{p.name}</span>
                        <span className="text-xs text-neutral-500 ml-auto">
                          {p.handicap}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
