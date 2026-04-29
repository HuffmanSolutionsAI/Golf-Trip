import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { checkCommissioner } from "@/lib/auth/eventPermissions";
import { emitChange } from "@/lib/events";
import type { RoundRow } from "@/lib/types";

export const runtime = "nodejs";

// Delete a round. Cascades everything via the FK ON DELETE CASCADE chain
// from rounds.id (holes, matches, scramble_entries, hole_scores,
// tee_groups, scramble_participants, tee_group_matches/entries). Highly
// destructive, so requires the body to literally contain confirm:'DELETE'
// — the client side asks the commissioner to type that string.
// (Plan A · Phase 3i)

const Body = z.object({
  confirm: z.literal("DELETE"),
});

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string; roundId: string }> },
) {
  const { slug, roundId } = await params;
  const guard = await checkCommissioner(slug);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Confirmation missing — type DELETE to confirm." },
      { status: 400 },
    );
  }

  const db = getDb();
  const round = db
    .prepare("SELECT * FROM rounds WHERE id = ? AND event_id = ?")
    .get(roundId, slug) as RoundRow | undefined;
  if (!round) {
    return NextResponse.json({ error: "Unknown round." }, { status: 404 });
  }

  db.prepare("DELETE FROM rounds WHERE id = ?").run(roundId);
  emitChange("rounds", slug);
  return NextResponse.json({ ok: true });
}
