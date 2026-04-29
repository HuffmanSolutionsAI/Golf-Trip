import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, genId } from "@/lib/db";
import { checkCommissioner } from "@/lib/auth/eventPermissions";
import { emitChange } from "@/lib/events";

export const runtime = "nodejs";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const Body = z.object({
  name: z.string().min(1).max(60),
  display_color: z.string().regex(HEX_COLOR, "Use a #rrggbb hex color."),
  sort_order: z.number().int().min(0).max(99).optional(),
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
  const sortOrder =
    parsed.data.sort_order ??
    (db
      .prepare(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM teams WHERE event_id = ?",
      )
      .get(slug) as { n: number }).n;

  const id = genId("team");
  db.prepare(
    `INSERT INTO teams (id, event_id, name, display_color, sort_order)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, slug, parsed.data.name, parsed.data.display_color, sortOrder);

  emitChange("players", slug);
  return NextResponse.json({ ok: true, id });
}
