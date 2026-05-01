import "server-only";
import { getDb } from "@/lib/db";
import { getCurrentEventId } from "@/lib/repo/events";
import type { TeeGroupRow } from "@/lib/types";

export type TeeGroupWithMembers = TeeGroupRow & {
  match_ids: string[];
  scramble_entry_ids: string[];
};

export function listTeeGroups(): TeeGroupRow[] {
  return getDb()
    .prepare(
      `SELECT g.* FROM tee_groups g
         JOIN rounds r ON r.id = g.round_id
         WHERE r.event_id = ?
         ORDER BY g.round_id, g.group_number`,
    )
    .all(getCurrentEventId()) as TeeGroupRow[];
}

export function listTeeGroupsForRound(roundId: string): TeeGroupRow[] {
  return getDb()
    .prepare(
      "SELECT * FROM tee_groups WHERE round_id = ? ORDER BY group_number",
    )
    .all(roundId) as TeeGroupRow[];
}

export function listTeeGroupsWithMembers(): TeeGroupWithMembers[] {
  const db = getDb();
  const groups = listTeeGroups();
  const matchRows = db
    .prepare("SELECT tee_group_id, match_id FROM tee_group_matches")
    .all() as { tee_group_id: string; match_id: string }[];
  const entryRows = db
    .prepare(
      "SELECT tee_group_id, scramble_entry_id FROM tee_group_entries",
    )
    .all() as { tee_group_id: string; scramble_entry_id: string }[];
  const matchByGroup = new Map<string, string[]>();
  for (const r of matchRows) {
    const arr = matchByGroup.get(r.tee_group_id) ?? [];
    arr.push(r.match_id);
    matchByGroup.set(r.tee_group_id, arr);
  }
  const entryByGroup = new Map<string, string[]>();
  for (const r of entryRows) {
    const arr = entryByGroup.get(r.tee_group_id) ?? [];
    arr.push(r.scramble_entry_id);
    entryByGroup.set(r.tee_group_id, arr);
  }
  return groups.map((g) => ({
    ...g,
    match_ids: matchByGroup.get(g.id) ?? [],
    scramble_entry_ids: entryByGroup.get(g.id) ?? [],
  }));
}

export function getTeeGroupForMatch(matchId: string): TeeGroupRow | null {
  const row = getDb()
    .prepare(
      `SELECT g.* FROM tee_groups g
       JOIN tee_group_matches m ON m.tee_group_id = g.id
       WHERE m.match_id = ?`,
    )
    .get(matchId) as TeeGroupRow | undefined;
  return row ?? null;
}

export function listMatchIdsForTeeGroup(teeGroupId: string): string[] {
  const rows = getDb()
    .prepare("SELECT match_id FROM tee_group_matches WHERE tee_group_id = ?")
    .all(teeGroupId) as { match_id: string }[];
  return rows.map((r) => r.match_id);
}

export function getTeeGroupForEntry(entryId: string): TeeGroupRow | null {
  const row = getDb()
    .prepare(
      `SELECT g.* FROM tee_groups g
       JOIN tee_group_entries e ON e.tee_group_id = g.id
       WHERE e.scramble_entry_id = ?`,
    )
    .get(entryId) as TeeGroupRow | undefined;
  return row ?? null;
}

export function getTeeGroup(id: string): TeeGroupRow | null {
  const row = getDb()
    .prepare("SELECT * FROM tee_groups WHERE id = ?")
    .get(id) as TeeGroupRow | undefined;
  return row ?? null;
}

export function updateTeeGroupScorer(
  teeGroupId: string,
  scorerPlayerId: string | null,
): void {
  getDb()
    .prepare(
      "UPDATE tee_groups SET scorer_player_id = ?, updated_at = datetime('now') WHERE id = ?",
    )
    .run(scorerPlayerId, teeGroupId);
}
