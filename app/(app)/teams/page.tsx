import Link from "next/link";
import { listPlayers } from "@/lib/repo/players";
import { computeLeaderboard } from "@/lib/repo/standings";
import { Card, CardContent } from "@/components/ui/card";
import { PageHero } from "@/components/layout/PageHero";
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
    <div className="paper-grain">
      <PageHero
        eyebrow="THE FIELD"
        title="Five teams"
        subtitle="Twenty members. By invitation only."
      />

      <div className="mx-auto max-w-3xl px-4 py-4 grid gap-3 grid-cols-1 sm:grid-cols-2">
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
                        <span
                          className="inline-block w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: team.display_color }}
                        />
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
