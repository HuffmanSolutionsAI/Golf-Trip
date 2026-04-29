import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { checkCommissioner } from "@/lib/auth/eventPermissions";
import { emitChange } from "@/lib/events";

export const runtime = "nodejs";

// Update a tee group's scorer or schedule. Member changes go through
// dedicated assign/unassign endpoints in a later phase; for now this is
// scorer + scheduled_time only. (Plan A · Phase 3e)
const Body = z.object({
  scorer_player_id: z.string().nullable().optional(),
  scheduled_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, "HH:MM (24-hour)")
    .transform((s) => (s.length === 5 ? `${s}:00` : s))
    .nullable()
    .optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string; groupId: string }> },
) {
  const { slug, groupId } = await params;
  const guard = await checkCommissioner(slug);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const db = getDb();
  // Verify the group belongs to a round of this event.
  const ownership = db
    .prepare(
      `SELECT g.id FROM tee_groups g
         JOIN rounds r ON r.id = g.round_id
         WHERE g.id = ? AND r.event_id = ?`,
    )
    .get(groupId, slug) as { id: string } | undefined;
  if (!ownership) {
    return NextResponse.json({ error: "Unknown tee group." }, { status: 404 });
  }

  if (parsed.data.scorer_player_id !== undefined) {
    if (parsed.data.scorer_player_id) {
      const ok = db
        .prepare(`SELECT 1 FROM players WHERE id = ? AND event_id = ?`)
        .get(parsed.data.scorer_player_id, slug);
      if (!ok) {
        return NextResponse.json(
          { error: "Scorer must be a player on this event." },
          { status: 400 },
        );
      }
    }
    db.prepare(
      `UPDATE tee_groups SET scorer_player_id = ?, updated_at = datetime('now') WHERE id = ?`,
    ).run(parsed.data.scorer_player_id, groupId);
  }
  if (parsed.data.scheduled_time !== undefined) {
    db.prepare(
      `UPDATE tee_groups SET scheduled_time = ?, updated_at = datetime('now') WHERE id = ?`,
    ).run(parsed.data.scheduled_time, groupId);
  }

  emitChange("matches", slug);
  return NextResponse.json({ ok: true });
}
