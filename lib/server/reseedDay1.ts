// Re-computes Day 1 stroke allocations for every match.
// Called after a handicap edit or after Holly's hole handicap_indexes are updated.

import { createAdminSupabase } from "@/lib/supabase/server";
import { computeStrokeAllocation } from "@/lib/scoring/handicaps";
import type { HoleRow, MatchRow, PlayerRow, RoundRow } from "@/lib/types";

type Admin = ReturnType<typeof createAdminSupabase>;

export async function reseedDay1StrokesIfUnlocked(admin: Admin) {
  const { data: round } = await admin
    .from("rounds")
    .select("*")
    .eq("day", 1)
    .maybeSingle();
  if (!round) return;
  if ((round as RoundRow).is_locked) return;

  const [{ data: matches }, { data: holes }, { data: players }] = await Promise.all([
    admin.from("matches").select("*").eq("round_id", (round as RoundRow).id),
    admin.from("holes").select("*").eq("round_id", (round as RoundRow).id),
    admin.from("players").select("*"),
  ]);

  if (!matches || !holes || !players) return;
  const pmap = new Map(
    (players as PlayerRow[]).map((p) => [p.id, p]),
  );

  for (const m of matches as MatchRow[]) {
    const p1 = pmap.get(m.player1_id);
    const p2 = pmap.get(m.player2_id);
    if (!p1 || !p2) continue;
    const alloc = computeStrokeAllocation(
      { id: p1.id, handicap: p1.handicap },
      { id: p2.id, handicap: p2.handicap },
      holes as HoleRow[],
    );
    await admin
      .from("matches")
      .update({
        stroke_giver_id: alloc.strokeGiverId,
        strokes_given: alloc.strokesGiven,
      })
      .eq("id", m.id);
  }
}
