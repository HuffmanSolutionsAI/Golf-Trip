import { listPlayers } from "@/lib/repo/players";
import { computeLeaderboard } from "@/lib/repo/standings";
import { LeaderboardView } from "./LeaderboardView";
import type { PlayerRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const rows = computeLeaderboard();
  const players = listPlayers();

  const byTeam: Record<string, PlayerRow[]> = {};
  for (const p of players) {
    (byTeam[p.team_id] ??= []).push(p);
  }
  for (const list of Object.values(byTeam)) {
    list.sort((a, b) => a.team_slot.localeCompare(b.team_slot));
  }

  return <LeaderboardView rows={rows} playersByTeam={byTeam} />;
}
