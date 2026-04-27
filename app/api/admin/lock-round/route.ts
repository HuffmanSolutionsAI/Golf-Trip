import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { postIfRoundLocked } from "@/lib/server/systemPosts";
import { recordAudit } from "@/lib/repo/audit";
import { emitChange } from "@/lib/events";
import type { RoundRow } from "@/lib/types";

const Body = z.object({
  roundId: z.string().min(1),
  locked: z.boolean().optional(),
});

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const db = getDb();
  const before = db.prepare("SELECT * FROM rounds WHERE id = ?").get(parsed.data.roundId) as RoundRow | undefined;
  if (!before) return NextResponse.json({ error: "Round not found." }, { status: 404 });

  const locked = parsed.data.locked ?? true;
  db.prepare("UPDATE rounds SET is_locked = ?, updated_at = datetime('now') WHERE id = ?").run(
    locked ? 1 : 0,
    parsed.data.roundId,
  );

  const after = db.prepare("SELECT * FROM rounds WHERE id = ?").get(parsed.data.roundId) as RoundRow;

  recordAudit({
    playerId: gate.playerId,
    action: locked ? "round.lock" : "round.unlock",
    entityType: "round",
    entityId: after.id,
    before: { is_locked: before.is_locked },
    after: { is_locked: after.is_locked },
  });

  postIfRoundLocked(after);
  emitChange("rounds");
  emitChange("chat_messages");
  return NextResponse.json({ ok: true });
}
