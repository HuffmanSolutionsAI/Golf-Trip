import { redirect } from "next/navigation";
import { getCurrentPlayer } from "@/lib/session";
import { listPlayers, listTeams } from "@/lib/repo/players";
import { listRounds, listAllHoles } from "@/lib/repo/rounds";
import { listScrambleEntries, listMatches, listParticipantsForEntry } from "@/lib/repo/scores";
import { listRecentAudit } from "@/lib/repo/audit";
import { listTeeGroupsWithMembers } from "@/lib/repo/teeGroups";
import { AdminTabs } from "./AdminTabs";
import type { PlayerRow, TeamRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const me = await getCurrentPlayer();
  if (!me?.is_admin) redirect("/home");

  const teams = listTeams();
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const players = listPlayers().map((p) => ({
    ...p,
    team: teamById.get(p.team_id)
      ? { name: teamById.get(p.team_id)!.name }
      : null,
  })) as (PlayerRow & { team: { name: string } | null })[];

  // Build tee group rows with the 4 participating player names for display.
  const matches = listMatches();
  const matchById = new Map(matches.map((m) => [m.id, m]));
  const playerById = new Map(players.map((p) => [p.id, p]));
  const teeGroups = listTeeGroupsWithMembers().map((g) => {
    const ids = new Set<string>();
    for (const mid of g.match_ids) {
      const m = matchById.get(mid);
      if (m) {
        ids.add(m.player1_id);
        ids.add(m.player2_id);
      }
    }
    for (const eid of g.scramble_entry_ids) {
      for (const p of listParticipantsForEntry(eid)) ids.add(p.player_id);
    }
    const playerNames = [...ids]
      .map((id) => playerById.get(id)?.name)
      .filter((n): n is string => !!n)
      .sort();
    return {
      id: g.id,
      round_id: g.round_id,
      group_number: g.group_number,
      scheduled_time: g.scheduled_time,
      scorer_player_id: g.scorer_player_id,
      player_names: playerNames,
    };
  });

  return (
    <AdminTabs
      players={players}
      teams={teams as TeamRow[]}
      rounds={listRounds()}
      holes={listAllHoles()}
      entries={listScrambleEntries()}
      audit={listRecentAudit(100)}
      teeGroups={teeGroups}
    />
  );
}
