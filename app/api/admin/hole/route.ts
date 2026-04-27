import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { reseedDay1StrokesIfUnlocked } from "@/lib/server/reseedDay1";
import { recordAudit } from "@/lib/repo/audit";
import { emitChange } from "@/lib/events";
import type { HoleRow, RoundRow } from "@/lib/types";

const Body = z.object({
  holeId: z.string().min(1),
  par: z.number().int().min(3).max(5).optional(),
  handicap_index: z.number().int().min(1).max(18).nullable().optional(),
  yardage: z.number().int().min(1).max(800).nullable().optional(),
});

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const db = getDb();
  const before = db.prepare("SELECT * FROM holes WHERE id = ?").get(parsed.data.holeId) as HoleRow | undefined;
  if (!before) return NextResponse.json({ error: "Hole not found." }, { status: 404 });

  const next = { ...before };
  if (parsed.data.par !== undefined) next.par = parsed.data.par;
  if (parsed.data.handicap_index !== undefined) next.handicap_index = parsed.data.handicap_index;
  if (parsed.data.yardage !== undefined) next.yardage = parsed.data.yardage;

  db.prepare(
    "UPDATE holes SET par = ?, handicap_index = ?, yardage = ?, updated_at = datetime('now') WHERE id = ?",
  ).run(next.par, next.handicap_index, next.yardage, before.id);

  recordAudit({
    playerId: gate.playerId,
    action: "hole.update",
    entityType: "hole",
    entityId: before.id,
    before: { par: before.par, handicap_index: before.handicap_index, yardage: before.yardage },
    after: { par: next.par, handicap_index: next.handicap_index, yardage: next.yardage },
  });

  const round = db.prepare("SELECT * FROM rounds WHERE id = ?").get(before.round_id) as RoundRow | undefined;
  if (round?.day === 1) reseedDay1StrokesIfUnlocked();

  emitChange("rounds");
  emitChange("matches");
  return NextResponse.json({ ok: true });
}
