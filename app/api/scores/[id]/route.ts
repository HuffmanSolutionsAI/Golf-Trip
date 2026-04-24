import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { deleteScore } from "@/lib/repo/scores";
import { emitChange } from "@/lib/events";
import { recordAudit } from "@/lib/repo/audit";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await params;
  deleteScore(id);
  recordAudit({
    playerId: gate.playerId,
    action: "score.delete",
    entityType: "hole_score",
    entityId: id,
  });
  emitChange("hole_scores");
  return NextResponse.json({ ok: true });
}
