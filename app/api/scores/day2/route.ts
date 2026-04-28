import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/server/requireAdmin";
import {
  getScrambleEntry,
  upsertScrambleScore,
} from "@/lib/repo/scores";
import { getTeeGroupForEntry } from "@/lib/repo/teeGroups";
import { getDb } from "@/lib/db";
import { emitChange } from "@/lib/events";
import { recordAudit } from "@/lib/repo/audit";
import {
  postIfLeaderChanged,
  postTeeTimeAlertIfDue,
} from "@/lib/server/systemPosts";
import type { RoundRow } from "@/lib/types";

const Body = z.object({
  scrambleEntryId: z.string().min(1),
  holeNumber: z.number().int().min(1).max(18),
  strokes: z.number().int().min(1).max(15),
});

export async function POST(req: Request) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const entry = getScrambleEntry(parsed.data.scrambleEntryId);
  if (!entry) return NextResponse.json({ error: "Entry not found." }, { status: 404 });

  if (!gate.isAdmin) {
    const group = getTeeGroupForEntry(entry.id);
    if (!group?.scorer_player_id || group.scorer_player_id !== gate.playerId) {
      return NextResponse.json(
        { error: "Only the designated scorer can enter this group's scores." },
        { status: 403 },
      );
    }
  }

  const db = getDb();
  const round = db.prepare("SELECT * FROM rounds WHERE id = ?").get(entry.round_id) as RoundRow | undefined;
  if (!round) return NextResponse.json({ error: "Round not found." }, { status: 404 });
  if (round.is_locked && !gate.isAdmin) {
    return NextResponse.json({ error: "Round is locked." }, { status: 403 });
  }

  const { inserted, scoreId } = upsertScrambleScore({
    roundId: entry.round_id,
    scrambleEntryId: entry.id,
    holeNumber: parsed.data.holeNumber,
    strokes: parsed.data.strokes,
    enteredBy: gate.playerId,
  });

  recordAudit({
    playerId: gate.playerId,
    action: inserted ? "score.insert" : "score.update",
    entityType: "hole_score",
    entityId: scoreId,
    after: {
      roundId: entry.round_id,
      scrambleEntryId: entry.id,
      holeNumber: parsed.data.holeNumber,
      strokes: parsed.data.strokes,
    },
  });

  emitChange("hole_scores");
  postIfLeaderChanged();
  postTeeTimeAlertIfDue();
  emitChange("chat_messages");

  return NextResponse.json({ ok: true, scoreId });
}
