import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { upsertPlayerScore, upsertScrambleScore } from "@/lib/repo/scores";
import { recordAudit } from "@/lib/repo/audit";
import { emitChange } from "@/lib/events";

const Body = z.union([
  z.object({
    scoreId: z.string().min(1),
    strokes: z.number().int().min(1).max(15),
  }),
  z.object({
    playerId: z.string().min(1).optional(),
    scrambleEntryId: z.string().min(1).optional(),
    roundId: z.string().min(1),
    holeNumber: z.number().int().min(1).max(18),
    strokes: z.number().int().min(1).max(15),
  }),
]);

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const db = getDb();

  if ("scoreId" in parsed.data) {
    db.prepare(
      "UPDATE hole_scores SET strokes = ?, entered_by = ?, entered_at = datetime('now') WHERE id = ?",
    ).run(parsed.data.strokes, gate.playerId, parsed.data.scoreId);
    recordAudit({
      playerId: gate.playerId,
      action: "score.override",
      entityType: "hole_score",
      entityId: parsed.data.scoreId,
      after: { strokes: parsed.data.strokes },
    });
    emitChange("hole_scores");
    return NextResponse.json({ ok: true });
  }

  const { playerId, scrambleEntryId, roundId, holeNumber, strokes } = parsed.data;
  if ((playerId ? 1 : 0) + (scrambleEntryId ? 1 : 0) !== 1) {
    return NextResponse.json(
      { error: "Exactly one of playerId or scrambleEntryId required." },
      { status: 400 },
    );
  }

  if (playerId) {
    const { scoreId } = upsertPlayerScore({
      roundId, playerId, holeNumber, strokes, enteredBy: gate.playerId,
    });
    recordAudit({
      playerId: gate.playerId,
      action: "score.override",
      entityType: "hole_score",
      entityId: scoreId,
      after: { roundId, playerId, holeNumber, strokes },
    });
  } else {
    const { scoreId } = upsertScrambleScore({
      roundId, scrambleEntryId: scrambleEntryId!, holeNumber, strokes, enteredBy: gate.playerId,
    });
    recordAudit({
      playerId: gate.playerId,
      action: "score.override",
      entityType: "hole_score",
      entityId: scoreId,
      after: { roundId, scrambleEntryId, holeNumber, strokes },
    });
  }

  emitChange("hole_scores");
  return NextResponse.json({ ok: true });
}
