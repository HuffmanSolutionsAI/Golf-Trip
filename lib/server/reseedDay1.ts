import "server-only";
import { getDb } from "@/lib/db";
import { computeStrokeAllocation } from "@/lib/scoring/handicaps";
import type { HoleRow, MatchRow, PlayerRow, RoundRow } from "@/lib/types";

/** Recompute every Day 1 match's stroke_giver_id + strokes_given from current handicaps. */
export function reseedDay1StrokesIfUnlocked() {
  const db = getDb();
  const round = db.prepare("SELECT * FROM rounds WHERE day = 1").get() as RoundRow | undefined;
  if (!round || round.is_locked) return;

  const matches = db.prepare("SELECT * FROM matches WHERE round_id = ?").all(round.id) as MatchRow[];
  const holes = db.prepare("SELECT * FROM holes WHERE round_id = ?").all(round.id) as HoleRow[];
  const players = db.prepare("SELECT * FROM players").all() as PlayerRow[];
  const pmap = new Map(players.map((p) => [p.id, p]));

  const update = db.prepare("UPDATE matches SET stroke_giver_id = ?, strokes_given = ? WHERE id = ?");
  const tx = db.transaction(() => {
    for (const m of matches) {
      const p1 = pmap.get(m.player1_id);
      const p2 = pmap.get(m.player2_id);
      if (!p1 || !p2) continue;
      const alloc = computeStrokeAllocation(p1, p2, holes);
      update.run(alloc.strokeGiverId, alloc.strokesGiven, m.id);
    }
  });
  tx();
}
