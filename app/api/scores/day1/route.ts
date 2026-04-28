import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/server/requireAdmin";
import { getMatch, upsertPlayerScore } from "@/lib/repo/scores";
import { getTeeGroupForMatch } from "@/lib/repo/teeGroups";
import { getDb } from "@/lib/db";
import { emitChange } from "@/lib/events";
import { recordAudit } from "@/lib/repo/audit";
import {
  postIfEagleOrBetter,
  postIfLeaderChanged,
  postIfMatchJustWentFinal,
  postTeeTimeAlertIfDue,
} from "@/lib/server/systemPosts";
import type { HoleRow, PlayerRow, RoundRow } from "@/lib/types";

const Body = z.object({
  matchId: z.string().min(1),
  playerId: z.string().min(1),
  holeNumber: z.number().int().min(1).max(18),
  strokes: z.number().int().min(1).max(15),
});

export async function POST(req: Request) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { matchId, playerId, holeNumber, strokes } = parsed.data;

  const match = getMatch(matchId);
  if (!match) return NextResponse.json({ error: "Match not found." }, { status: 404 });
  if (playerId !== match.player1_id && playerId !== match.player2_id) {
    return NextResponse.json({ error: "Player not in match." }, { status: 400 });
  }

  // Permissions: only the designated scorer of this match's tee group, or admin.
  const db = getDb();
  if (!gate.isAdmin) {
    const group = getTeeGroupForMatch(matchId);
    if (!group?.scorer_player_id || group.scorer_player_id !== gate.playerId) {
      return NextResponse.json(
        { error: "Only the designated scorer can enter this match's scores." },
        { status: 403 },
      );
    }
  }

  const round = db.prepare("SELECT * FROM rounds WHERE id = ?").get(match.round_id) as RoundRow | undefined;
  if (!round) return NextResponse.json({ error: "Round not found." }, { status: 404 });
  if (round.is_locked && !gate.isAdmin) {
    return NextResponse.json({ error: "Round is locked." }, { status: 403 });
  }

  const { inserted, scoreId } = upsertPlayerScore({
    roundId: match.round_id,
    playerId,
    holeNumber,
    strokes,
    enteredBy: gate.playerId,
  });

  recordAudit({
    playerId: gate.playerId,
    action: inserted ? "score.insert" : "score.update",
    entityType: "hole_score",
    entityId: scoreId,
    after: { roundId: match.round_id, playerId, holeNumber, strokes },
  });

  emitChange("hole_scores");

  // Side effects.
  const hole = db
    .prepare("SELECT * FROM holes WHERE round_id = ? AND hole_number = ?")
    .get(match.round_id, holeNumber) as HoleRow | undefined;
  const player = db.prepare("SELECT * FROM players WHERE id = ?").get(playerId) as PlayerRow | undefined;
  if (hole && player) postIfEagleOrBetter(strokes, hole, player, round);
  postIfMatchJustWentFinal(matchId);
  postIfLeaderChanged();
  postTeeTimeAlertIfDue();
  emitChange("chat_messages");

  return NextResponse.json({ ok: true, scoreId });
}
