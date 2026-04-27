import { listPlayers } from "@/lib/repo/players";
import { listRounds } from "@/lib/repo/rounds";
import {
  computeDay1IndividualLeaderboard,
  computeDay2EntryLeaderboard,
  computeDay3EntryLeaderboard,
  computeLeaderboard,
} from "@/lib/repo/standings";
import { LeaderboardView } from "./LeaderboardView";
import type { PlayerRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const overall = computeLeaderboard();
  const day1 = computeDay1IndividualLeaderboard();
  const day2 = computeDay2EntryLeaderboard();
  const day3 = computeDay3EntryLeaderboard();
  const rounds = listRounds();
  const players = listPlayers();

  const byTeam: Record<string, PlayerRow[]> = {};
  for (const p of players) {
    (byTeam[p.team_id] ??= []).push(p);
  }
  for (const list of Object.values(byTeam)) {
    list.sort((a, b) => a.team_slot.localeCompare(b.team_slot));
  }

  return (
    <LeaderboardView
      overall={overall}
      day1={day1}
      day2={day2}
      day3={day3}
      rounds={rounds}
      playersByTeam={byTeam}
    />
  );
}
