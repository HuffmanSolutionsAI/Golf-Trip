import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, genId } from "@/lib/db";
import { checkCommissioner } from "@/lib/auth/eventPermissions";
import { computeStrokeAllocation } from "@/lib/scoring/handicaps";
import { emitChange } from "@/lib/events";
import type { HoleRow, PlayerRow, RoundRow } from "@/lib/types";

export const runtime = "nodejs";

const Body = z.object({
  player1_id: z.string().min(1),
  player2_id: z.string().min(1),
  match_number: z.number().int().min(1).max(10).optional(),
});

// Add one head-to-head match to a singles round. Stroke allocation is
// computed from the two handicaps + the round's holes (handicap indices)
// using the same algorithm Day 1 uses. (Plan A · Phase 3e)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string; roundId: string }> },
) {
  const { slug, roundId } = await params;
  const guard = await checkCommissioner(slug);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }
  const { player1_id, player2_id } = parsed.data;
  if (player1_id === player2_id) {
    return NextResponse.json(
      { error: "A player can't play themselves." },
      { status: 400 },
    );
  }

  const db = getDb();
  const round = db
    .prepare("SELECT * FROM rounds WHERE id = ? AND event_id = ?")
    .get(roundId, slug) as RoundRow | undefined;
  if (!round) {
    return NextResponse.json({ error: "Unknown round." }, { status: 404 });
  }
  if (round.format !== "singles") {
    return NextResponse.json(
      { error: "Pairings only apply to match-play rounds." },
      { status: 400 },
    );
  }

  const p1 = db
    .prepare("SELECT * FROM players WHERE id = ? AND event_id = ?")
    .get(player1_id, slug) as PlayerRow | undefined;
  const p2 = db
    .prepare("SELECT * FROM players WHERE id = ? AND event_id = ?")
    .get(player2_id, slug) as PlayerRow | undefined;
  if (!p1 || !p2) {
    return NextResponse.json(
      { error: "Both players must belong to this event." },
      { status: 400 },
    );
  }

  // Refuse if either player is already in a match on this round.
  const conflict = db
    .prepare(
      `SELECT id FROM matches
         WHERE round_id = ?
           AND (player1_id IN (?, ?) OR player2_id IN (?, ?))
         LIMIT 1`,
    )
    .get(roundId, player1_id, player2_id, player1_id, player2_id) as
    | { id: string }
    | undefined;
  if (conflict) {
    return NextResponse.json(
      { error: "One of those players is already in a match this round." },
      { status: 409 },
    );
  }

  // Match number: explicit or next free.
  let matchNumber = parsed.data.match_number;
  if (matchNumber === undefined) {
    const max = db
      .prepare(
        "SELECT COALESCE(MAX(match_number), 0) AS n FROM matches WHERE round_id = ?",
      )
      .get(roundId) as { n: number };
    matchNumber = max.n + 1;
    if (matchNumber > 10) {
      return NextResponse.json(
        { error: "Round already has the maximum 10 matches." },
        { status: 409 },
      );
    }
  } else {
    const taken = db
      .prepare(
        "SELECT id FROM matches WHERE round_id = ? AND match_number = ?",
      )
      .get(roundId, matchNumber) as { id: string } | undefined;
    if (taken) {
      return NextResponse.json(
        { error: `Match number ${matchNumber} already used.` },
        { status: 409 },
      );
    }
  }

  const holes = db
    .prepare(
      "SELECT hole_number, handicap_index FROM holes WHERE round_id = ?",
    )
    .all(roundId) as HoleRow[];
  const alloc = computeStrokeAllocation(p1, p2, holes);

  const id = genId("m");
  db.prepare(
    `INSERT INTO matches (id, round_id, match_number, player1_id, player2_id, stroke_giver_id, strokes_given)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    roundId,
    matchNumber,
    player1_id,
    player2_id,
    alloc.strokeGiverId,
    alloc.strokesGiven,
  );

  emitChange("matches", slug);
  return NextResponse.json({
    ok: true,
    id,
    match_number: matchNumber,
    stroke_giver_id: alloc.strokeGiverId,
    strokes_given: alloc.strokesGiven,
  });
}
