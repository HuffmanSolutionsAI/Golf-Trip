import "server-only";
import { getDb } from "@/lib/db";
import { getCurrentEventId } from "@/lib/repo/events";
import type { PlayerRow, TeamRow } from "@/lib/types";

export function listPlayers(): PlayerRow[] {
  return getDb()
    .prepare(
      "SELECT * FROM players WHERE event_id = ? ORDER BY team_id, team_slot",
    )
    .all(getCurrentEventId()) as PlayerRow[];
}

export function listPlayersByTeam(teamId: string): PlayerRow[] {
  return getDb()
    .prepare(
      "SELECT * FROM players WHERE event_id = ? AND team_id = ? ORDER BY team_slot",
    )
    .all(getCurrentEventId(), teamId) as PlayerRow[];
}

export function getPlayer(id: string): PlayerRow | null {
  const row = getDb()
    .prepare("SELECT * FROM players WHERE event_id = ? AND id = ?")
    .get(getCurrentEventId(), id) as PlayerRow | undefined;
  return row ?? null;
}

export function getPlayerWithTeam(
  id: string,
): (PlayerRow & { team: TeamRow }) | null {
  const p = getPlayer(id);
  if (!p) return null;
  const team = getDb()
    .prepare("SELECT * FROM teams WHERE event_id = ? AND id = ?")
    .get(getCurrentEventId(), p.team_id) as TeamRow | undefined;
  if (!team) return null;
  return { ...p, team };
}

export function listTeams(): TeamRow[] {
  return getDb()
    .prepare("SELECT * FROM teams WHERE event_id = ? ORDER BY sort_order")
    .all(getCurrentEventId()) as TeamRow[];
}

export function getTeam(id: string): TeamRow | null {
  const row = getDb()
    .prepare("SELECT * FROM teams WHERE event_id = ? AND id = ?")
    .get(getCurrentEventId(), id) as TeamRow | undefined;
  return row ?? null;
}

export function updateTeamName(teamId: string, name: string): void {
  getDb()
    .prepare(
      "UPDATE teams SET name = ?, updated_at = datetime('now') WHERE event_id = ? AND id = ?",
    )
    .run(name, getCurrentEventId(), teamId);
}
