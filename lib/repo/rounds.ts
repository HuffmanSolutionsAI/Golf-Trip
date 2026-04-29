import "server-only";
import { getDb } from "@/lib/db";
import { getCurrentEventId } from "@/lib/repo/events";
import type { HoleRow, RoundRow } from "@/lib/types";

export function listRounds(): RoundRow[] {
  return getDb()
    .prepare("SELECT * FROM rounds WHERE event_id = ? ORDER BY day")
    .all(getCurrentEventId()) as RoundRow[];
}

export function getRound(id: string): RoundRow | null {
  const row = getDb()
    .prepare("SELECT * FROM rounds WHERE event_id = ? AND id = ?")
    .get(getCurrentEventId(), id) as RoundRow | undefined;
  return row ?? null;
}

export function getRoundByDay(day: 1 | 2 | 3): RoundRow | null {
  const row = getDb()
    .prepare("SELECT * FROM rounds WHERE event_id = ? AND day = ?")
    .get(getCurrentEventId(), day) as RoundRow | undefined;
  return row ?? null;
}

// Holes belong to a round; scoping by round_id implicitly scopes by event.
export function listHoles(roundId: string): HoleRow[] {
  return getDb()
    .prepare("SELECT * FROM holes WHERE round_id = ? ORDER BY hole_number")
    .all(roundId) as HoleRow[];
}

export function listAllHoles(): HoleRow[] {
  return getDb()
    .prepare(
      `SELECT h.* FROM holes h
         JOIN rounds r ON r.id = h.round_id
         WHERE r.event_id = ?
         ORDER BY h.round_id, h.hole_number`,
    )
    .all(getCurrentEventId()) as HoleRow[];
}
