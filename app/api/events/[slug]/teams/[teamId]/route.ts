import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { checkCommissioner } from "@/lib/auth/eventPermissions";
import { emitChange } from "@/lib/events";

export const runtime = "nodejs";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

// Edit a team's display fields. (Plan A · Phase 3h)
// All fields optional — caller sends only the keys they want to change.
const Body = z
  .object({
    name: z.string().min(1).max(60).optional(),
    display_color: z
      .string()
      .regex(HEX_COLOR, "Use a #rrggbb hex color.")
      .optional(),
    sort_order: z.number().int().min(0).max(99).optional(),
  })
  .refine(
    (v) =>
      v.name !== undefined ||
      v.display_color !== undefined ||
      v.sort_order !== undefined,
    { message: "Nothing to update." },
  );

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string; teamId: string }> },
) {
  const { slug, teamId } = await params;
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
  const team = db
    .prepare("SELECT id FROM teams WHERE id = ? AND event_id = ?")
    .get(teamId, slug) as { id: string } | undefined;
  if (!team) {
    return NextResponse.json({ error: "Unknown team." }, { status: 404 });
  }

  const sets: string[] = [];
  const values: unknown[] = [];
  if (parsed.data.name !== undefined) {
    sets.push("name = ?");
    values.push(parsed.data.name);
  }
  if (parsed.data.display_color !== undefined) {
    sets.push("display_color = ?");
    values.push(parsed.data.display_color);
  }
  if (parsed.data.sort_order !== undefined) {
    sets.push("sort_order = ?");
    values.push(parsed.data.sort_order);
  }
  sets.push("updated_at = datetime('now')");
  values.push(teamId);
  db.prepare(`UPDATE teams SET ${sets.join(", ")} WHERE id = ?`).run(...values);

  emitChange("players", slug);
  return NextResponse.json({ ok: true });
}

// Delete a team. Refuses if any players or scramble_entries still point
// at this team — commissioner has to clear the team's roster first (and
// any rounds that have entries on this team). Keeps blast radius
// visible. (Plan A · Phase 3i)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string; teamId: string }> },
) {
  const { slug, teamId } = await params;
  const guard = await checkCommissioner(slug);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const db = getDb();
  const team = db
    .prepare("SELECT id, name FROM teams WHERE id = ? AND event_id = ?")
    .get(teamId, slug) as { id: string; name: string } | undefined;
  if (!team) {
    return NextResponse.json({ error: "Unknown team." }, { status: 404 });
  }

  const playerCount = db
    .prepare("SELECT COUNT(*) AS n FROM players WHERE team_id = ?")
    .get(teamId) as { n: number };
  if (playerCount.n > 0) {
    return NextResponse.json(
      {
        error: `${team.name} still has ${playerCount.n} player${playerCount.n === 1 ? "" : "s"}. Move or delete them first.`,
      },
      { status: 409 },
    );
  }

  const entryCount = db
    .prepare("SELECT COUNT(*) AS n FROM scramble_entries WHERE team_id = ?")
    .get(teamId) as { n: number };
  if (entryCount.n > 0) {
    return NextResponse.json(
      {
        error: `${team.name} is on ${entryCount.n} scramble entr${entryCount.n === 1 ? "y" : "ies"}. Delete those rounds first.`,
      },
      { status: 409 },
    );
  }

  db.prepare("DELETE FROM teams WHERE id = ?").run(teamId);
  emitChange("players", slug);
  return NextResponse.json({ ok: true });
}
