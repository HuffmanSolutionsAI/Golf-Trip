import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/session";
import { deleteScore } from "@/lib/repo/scores";
import { getDb } from "@/lib/db";
import {
  getTeeGroupForEntry,
  getTeeGroupForMatch,
} from "@/lib/repo/teeGroups";
import { emitChange } from "@/lib/events";
import { recordAudit } from "@/lib/repo/audit";
import { runWithEvent } from "@/lib/repo/events";
import type { HoleScoreRow, MatchRow, RoundRow } from "@/lib/types";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentPlayer();
  if (!me) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();
  const score = db
    .prepare("SELECT * FROM hole_scores WHERE id = ?")
    .get(id) as HoleScoreRow | undefined;
  if (!score) {
    return NextResponse.json({ error: "Score not found." }, { status: 404 });
  }

  const round = db
    .prepare("SELECT * FROM rounds WHERE id = ?")
    .get(score.round_id) as RoundRow | undefined;
  if (!round) {
    return NextResponse.json({ error: "Round not found." }, { status: 404 });
  }

  if (round.is_locked && !me.is_admin) {
    return NextResponse.json({ error: "Round is locked." }, { status: 403 });
  }

  if (!me.is_admin) {
    let scorerId: string | null = null;
    if (score.player_id) {
      const match = db
        .prepare(
          "SELECT * FROM matches WHERE round_id = ? AND (player1_id = ? OR player2_id = ?)",
        )
        .get(score.round_id, score.player_id, score.player_id) as
        | MatchRow
        | undefined;
      if (match) {
        scorerId = getTeeGroupForMatch(match.id)?.scorer_player_id ?? null;
      }
    } else if (score.scramble_entry_id) {
      scorerId = getTeeGroupForEntry(score.scramble_entry_id)?.scorer_player_id ?? null;
    }
    if (!scorerId || scorerId !== me.id) {
      return NextResponse.json(
        { error: "Only the designated scorer or commissioner can delete." },
        { status: 403 },
      );
    }
  }

  return runWithEvent(round.event_id, () => {
    deleteScore(id);
    recordAudit({
      playerId: me.id,
      action: "score.delete",
      entityType: "hole_score",
      entityId: id,
      before: {
        roundId: score.round_id,
        playerId: score.player_id,
        scrambleEntryId: score.scramble_entry_id,
        holeNumber: score.hole_number,
        strokes: score.strokes,
      },
    });
    emitChange("hole_scores");
    return NextResponse.json({ ok: true });
  });
}
