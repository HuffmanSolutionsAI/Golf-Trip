import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { checkCommissioner } from "@/lib/auth/eventPermissions";
import { emitChange } from "@/lib/events";

export const runtime = "nodejs";

// Edit a player. (Plan A · Phase 3h)
// All fields optional. team_id / team_slot edits go through a slot-
// collision check; email "" maps to NULL so commissioners can clear it.
const Body = z
  .object({
    name: z.string().min(1).max(80).optional(),
    handicap: z.number().min(-10).max(54).optional(),
    email: z.string().email().or(z.literal("")).optional(),
    team_id: z.string().min(1).optional(),
    team_slot: z.enum(["A", "B", "C", "D"]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update." });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string; playerId: string }> },
) {
  const { slug, playerId } = await params;
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
  const player = db
    .prepare("SELECT * FROM players WHERE id = ? AND event_id = ?")
    .get(playerId, slug) as
    | { id: string; team_id: string; team_slot: "A" | "B" | "C" | "D" }
    | undefined;
  if (!player) {
    return NextResponse.json({ error: "Unknown player." }, { status: 404 });
  }

  const targetTeamId = parsed.data.team_id ?? player.team_id;
  const targetSlot = parsed.data.team_slot ?? player.team_slot;

  if (parsed.data.team_id !== undefined) {
    const teamOk = db
      .prepare("SELECT 1 FROM teams WHERE id = ? AND event_id = ?")
      .get(parsed.data.team_id, slug);
    if (!teamOk) {
      return NextResponse.json({ error: "Unknown team." }, { status: 400 });
    }
  }

  if (
    (parsed.data.team_id !== undefined || parsed.data.team_slot !== undefined) &&
    (targetTeamId !== player.team_id || targetSlot !== player.team_slot)
  ) {
    const taken = db
      .prepare(
        "SELECT id FROM players WHERE team_id = ? AND team_slot = ? AND id <> ?",
      )
      .get(targetTeamId, targetSlot, playerId) as { id: string } | undefined;
    if (taken) {
      return NextResponse.json(
        { error: `Slot ${targetSlot} already taken on this team.` },
        { status: 409 },
      );
    }
  }

  const sets: string[] = [];
  const values: unknown[] = [];
  if (parsed.data.name !== undefined) {
    sets.push("name = ?");
    values.push(parsed.data.name);
  }
  if (parsed.data.handicap !== undefined) {
    sets.push("handicap = ?");
    values.push(parsed.data.handicap);
  }
  if (parsed.data.email !== undefined) {
    sets.push("email = ?");
    values.push(parsed.data.email === "" ? null : parsed.data.email.toLowerCase());
  }
  if (parsed.data.team_id !== undefined) {
    sets.push("team_id = ?");
    values.push(parsed.data.team_id);
  }
  if (parsed.data.team_slot !== undefined) {
    sets.push("team_slot = ?");
    values.push(parsed.data.team_slot);
  }
  sets.push("updated_at = datetime('now')");
  values.push(playerId);
  db.prepare(`UPDATE players SET ${sets.join(", ")} WHERE id = ?`).run(
    ...values,
  );

  emitChange("players", slug);
  return NextResponse.json({ ok: true });
}
