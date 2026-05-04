import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { getDb } from "@/lib/db";
import { recordAudit } from "@/lib/repo/audit";
import { emitChange } from "@/lib/events";
import { runWithEvent } from "@/lib/repo/events";
import type { RoundRow } from "@/lib/types";

const Body = z.object({
  roundId: z.string().min(1),
  playerIds: z.array(z.string().min(1)).optional(),
  entryIds: z.array(z.string().min(1)).optional(),
});

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { roundId, playerIds, entryIds } = parsed.data;
  if ((playerIds?.length ?? 0) === 0 && (entryIds?.length ?? 0) === 0) {
    return NextResponse.json(
      { error: "Provide playerIds or entryIds." },
      { status: 400 },
    );
  }

  const db = getDb();
  const round = db
    .prepare("SELECT * FROM rounds WHERE id = ?")
    .get(roundId) as RoundRow | undefined;
  if (!round) {
    return NextResponse.json({ error: "Round not found." }, { status: 404 });
  }

  return runWithEvent(round.event_id, () => {
    let deleted = 0;
    if (playerIds && playerIds.length > 0) {
      const placeholders = playerIds.map(() => "?").join(",");
      const result = db
        .prepare(
          `DELETE FROM hole_scores WHERE round_id = ? AND player_id IN (${placeholders})`,
        )
        .run(roundId, ...playerIds);
      deleted += result.changes;
    }
    if (entryIds && entryIds.length > 0) {
      const placeholders = entryIds.map(() => "?").join(",");
      const result = db
        .prepare(
          `DELETE FROM hole_scores WHERE round_id = ? AND scramble_entry_id IN (${placeholders})`,
        )
        .run(roundId, ...entryIds);
      deleted += result.changes;
    }

    recordAudit({
      playerId: gate.playerId,
      action: "score.clear",
      entityType: "hole_score",
      entityId: roundId,
      before: { roundId, playerIds, entryIds, deleted },
    });

    emitChange("hole_scores");
    return NextResponse.json({ ok: true, deleted });
  });
}
