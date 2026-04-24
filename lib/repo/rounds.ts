import "server-only";
import { getDb } from "@/lib/db";
import type { HoleRow, RoundRow } from "@/lib/types";

export function listRounds(): RoundRow[] {
  return getDb().prepare("SELECT * FROM rounds ORDER BY day").all() as RoundRow[];
}

export function getRound(id: string): RoundRow | null {
  const row = getDb().prepare("SELECT * FROM rounds WHERE id = ?").get(id) as RoundRow | undefined;
  return row ?? null;
}

export function getRoundByDay(day: 1 | 2 | 3): RoundRow | null {
  const row = getDb().prepare("SELECT * FROM rounds WHERE day = ?").get(day) as RoundRow | undefined;
  return row ?? null;
}

export function listHoles(roundId: string): HoleRow[] {
  return getDb()
    .prepare("SELECT * FROM holes WHERE round_id = ? ORDER BY hole_number")
    .all(roundId) as HoleRow[];
}

export function listAllHoles(): HoleRow[] {
  return getDb().prepare("SELECT * FROM holes ORDER BY round_id, hole_number").all() as HoleRow[];
}
