import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { checkCommissioner } from "@/lib/auth/eventPermissions";
import { emitChange } from "@/lib/events";

export const runtime = "nodejs";

// Set or clear the brand override on an event. (Plan A · Phase 5)
// Body: { brand_override_id: string | null }. The id must reference an
// existing brand_overrides row; null clears the override and the event
// renders with the app's default palette.

const Body = z.object({
  brand_override_id: z.string().min(1).nullable(),
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
  if (parsed.data.brand_override_id) {
    const ok = db
      .prepare("SELECT 1 FROM brand_overrides WHERE id = ?")
      .get(parsed.data.brand_override_id);
    if (!ok) {
      return NextResponse.json(
        { error: "Unknown brand preset." },
        { status: 400 },
      );
    }
  }

  db.prepare(
    `UPDATE events SET brand_override_id = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(parsed.data.brand_override_id, slug);

  emitChange("rounds", slug);
  return NextResponse.json({ ok: true });
}
