import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, genId } from "@/lib/db";
import { checkCommissioner } from "@/lib/auth/eventPermissions";
import { emitChange } from "@/lib/events";

export const runtime = "nodejs";

const Body = z.object({
  name: z.string().min(1).max(80),
  handicap: z.number().min(-10).max(54),
  team_id: z.string().min(1),
  team_slot: z.enum(["A", "B", "C", "D"]),
  email: z.string().email().optional().or(z.literal("")),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
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
  // Validate team belongs to this event.
  const team = db
    .prepare("SELECT id FROM teams WHERE id = ? AND event_id = ?")
    .get(parsed.data.team_id, slug) as { id: string } | undefined;
  if (!team) {
    return NextResponse.json({ error: "Unknown team." }, { status: 400 });
  }

  // Slot must be free on this team.
  const taken = db
    .prepare(
      "SELECT id FROM players WHERE team_id = ? AND team_slot = ?",
    )
    .get(parsed.data.team_id, parsed.data.team_slot) as { id: string } | undefined;
  if (taken) {
    return NextResponse.json(
      { error: `Slot ${parsed.data.team_slot} already taken on this team.` },
      { status: 409 },
    );
  }

  const id = genId("p");
  const email =
    parsed.data.email && parsed.data.email.length > 0
      ? parsed.data.email.toLowerCase()
      : null;

  db.prepare(
    `INSERT INTO players (id, event_id, name, handicap, team_id, team_slot, email)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    slug,
    parsed.data.name,
    parsed.data.handicap,
    parsed.data.team_id,
    parsed.data.team_slot,
    email,
  );

  emitChange("players", slug);
  return NextResponse.json({ ok: true, id });
}
