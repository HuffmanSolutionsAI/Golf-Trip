import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { checkCommissioner } from "@/lib/auth/eventPermissions";
import { emitChange } from "@/lib/events";

export const runtime = "nodejs";

// Delete a match. Refuses if either player has any hole_score on this
// round — those scores would otherwise become orphaned but real, and we
// don't surface a clear-scores UI yet. The commissioner can use the
// existing admin override-score flow to clear scores first if needed.
// (Plan A · Phase 3h)
//
// Cascade: tee_group_matches.match_id has ON DELETE CASCADE so the
// match's tee-group binding (if any) drops automatically.
export async function DELETE(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{ slug: string; roundId: string; matchId: string }>;
  },
) {
  const { slug, roundId, matchId } = await params;
  const guard = await checkCommissioner(slug);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const db = getDb();
  const match = db
    .prepare(
      `SELECT m.id, m.player1_id, m.player2_id
         FROM matches m
         JOIN rounds r ON r.id = m.round_id
         WHERE m.id = ? AND m.round_id = ? AND r.event_id = ?`,
    )
    .get(matchId, roundId, slug) as
    | { id: string; player1_id: string; player2_id: string }
    | undefined;
  if (!match) {
    return NextResponse.json({ error: "Unknown match." }, { status: 404 });
  }

  const scoreCount = db
    .prepare(
      `SELECT COUNT(*) AS n FROM hole_scores
         WHERE round_id = ? AND player_id IN (?, ?)`,
    )
    .get(roundId, match.player1_id, match.player2_id) as { n: number };
  if (scoreCount.n > 0) {
    return NextResponse.json(
      {
        error: `Can't delete: ${scoreCount.n} hole score${
          scoreCount.n === 1 ? "" : "s"
        } already entered for these players this round.`,
      },
      { status: 409 },
    );
  }

  db.prepare("DELETE FROM matches WHERE id = ?").run(matchId);
  emitChange("matches", slug);
  return NextResponse.json({ ok: true });
}
