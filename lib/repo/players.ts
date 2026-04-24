import "server-only";
import { getDb } from "@/lib/db";
import type { PlayerRow, TeamRow } from "@/lib/types";

export function listPlayers(): PlayerRow[] {
  return getDb().prepare("SELECT * FROM players ORDER BY team_id, team_slot").all() as PlayerRow[];
}

export function listPlayersByTeam(teamId: string): PlayerRow[] {
  return getDb().prepare("SELECT * FROM players WHERE team_id = ? ORDER BY team_slot").all(teamId) as PlayerRow[];
}

export function getPlayer(id: string): PlayerRow | null {
  const row = getDb().prepare("SELECT * FROM players WHERE id = ?").get(id) as PlayerRow | undefined;
  return row ?? null;
}

export function getPlayerWithTeam(id: string): (PlayerRow & { team: TeamRow }) | null {
  const p = getPlayer(id);
  if (!p) return null;
  const team = getDb().prepare("SELECT * FROM teams WHERE id = ?").get(p.team_id) as TeamRow | undefined;
  if (!team) return null;
  return { ...p, team };
}

export function listTeams(): TeamRow[] {
  return getDb().prepare("SELECT * FROM teams ORDER BY sort_order").all() as TeamRow[];
}

export function getTeam(id: string): TeamRow | null {
  const row = getDb().prepare("SELECT * FROM teams WHERE id = ?").get(id) as TeamRow | undefined;
  return row ?? null;
}
