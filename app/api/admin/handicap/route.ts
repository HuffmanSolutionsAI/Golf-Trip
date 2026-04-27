import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { reseedDay1StrokesIfUnlocked } from "@/lib/server/reseedDay1";
import { recordAudit } from "@/lib/repo/audit";
import { emitChange } from "@/lib/events";
import type { PlayerRow } from "@/lib/types";

const Body = z.object({
  playerId: z.string().min(1),
  handicap: z.number().min(0).max(54),
});

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const db = getDb();
  const before = db.prepare("SELECT * FROM players WHERE id = ?").get(parsed.data.playerId) as PlayerRow | undefined;
  if (!before) return NextResponse.json({ error: "Player not found." }, { status: 404 });

  db.prepare("UPDATE players SET handicap = ?, updated_at = datetime('now') WHERE id = ?").run(
    parsed.data.handicap,
    parsed.data.playerId,
  );

  recordAudit({
    playerId: gate.playerId,
    action: "player.handicap.update",
    entityType: "player",
    entityId: parsed.data.playerId,
    before: { handicap: before.handicap },
    after: { handicap: parsed.data.handicap },
  });

  reseedDay1StrokesIfUnlocked();
  emitChange("players");
  emitChange("matches");
  return NextResponse.json({ ok: true });
}
