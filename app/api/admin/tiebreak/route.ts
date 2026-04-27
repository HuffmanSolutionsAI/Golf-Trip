import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { recordAudit } from "@/lib/repo/audit";
import { emitChange } from "@/lib/events";
import type { ScrambleEntryRow } from "@/lib/types";

const Body = z.object({
  scrambleEntryId: z.string().min(1),
  manualRank: z.number().int().min(1).max(5).nullable(),
});

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const db = getDb();
  const before = db
    .prepare("SELECT * FROM scramble_entries WHERE id = ?")
    .get(parsed.data.scrambleEntryId) as ScrambleEntryRow | undefined;
  if (!before) return NextResponse.json({ error: "Entry not found." }, { status: 404 });

  db.prepare(
    "UPDATE scramble_entries SET manual_tiebreak_rank = ?, updated_at = datetime('now') WHERE id = ?",
  ).run(parsed.data.manualRank, parsed.data.scrambleEntryId);

  recordAudit({
    playerId: gate.playerId,
    action: "scramble_entry.tiebreak.update",
    entityType: "scramble_entry",
    entityId: parsed.data.scrambleEntryId,
    before: { manual_tiebreak_rank: before.manual_tiebreak_rank },
    after: { manual_tiebreak_rank: parsed.data.manualRank },
  });

  emitChange("scramble_entries");
  return NextResponse.json({ ok: true });
}
