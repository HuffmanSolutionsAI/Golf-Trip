import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/server/requireAdmin";
import {
  getTeeGroup,
  updateTeeGroupScorer,
} from "@/lib/repo/teeGroups";
import { getPlayer } from "@/lib/repo/players";
import { recordAudit } from "@/lib/repo/audit";
import { emitChange } from "@/lib/events";

const Body = z.object({
  teeGroupId: z.string().min(1),
  scorerPlayerId: z.string().min(1).nullable(),
});

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const group = getTeeGroup(parsed.data.teeGroupId);
  if (!group) {
    return NextResponse.json(
      { error: "Tee group not found." },
      { status: 404 },
    );
  }
  if (parsed.data.scorerPlayerId && !getPlayer(parsed.data.scorerPlayerId)) {
    return NextResponse.json(
      { error: "Scorer not found." },
      { status: 404 },
    );
  }

  updateTeeGroupScorer(group.id, parsed.data.scorerPlayerId);

  recordAudit({
    playerId: gate.playerId,
    action: "tee_group.scorer.update",
    entityType: "tee_group",
    entityId: group.id,
    before: { scorer: group.scorer_player_id },
    after: { scorer: parsed.data.scorerPlayerId },
  });

  emitChange("matches");
  return NextResponse.json({ ok: true });
}
