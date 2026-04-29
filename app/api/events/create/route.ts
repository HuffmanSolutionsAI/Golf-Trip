import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { assignRole } from "@/lib/auth/roles";

export const runtime = "nodejs";

// Lowercased, dashed slug. Reserved prefixes are forbidden so we never
// collide with the canonical 'event-1' bootstrap row or 'event-' nameplate.
const SlugRe = /^[a-z0-9](?:[a-z0-9-]{1,62})[a-z0-9]$/;
const RESERVED_PREFIXES = ["event-", "events-", "api-", "auth-"];

const Body = z.object({
  slug: z
    .string()
    .min(3)
    .max(64)
    .regex(SlugRe, "Use lowercase letters, digits, and dashes."),
  name: z.string().min(2).max(120),
  subtitle: z.string().max(120).optional(),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD")
    .optional(),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD")
    .optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to create an event." },
      { status: 401 },
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }
  const { slug, name, subtitle, start_date, end_date } = parsed.data;

  if (RESERVED_PREFIXES.some((p) => slug.startsWith(p))) {
    return NextResponse.json(
      { error: "Slug uses a reserved prefix." },
      { status: 400 },
    );
  }
  if (start_date && end_date && end_date < start_date) {
    return NextResponse.json(
      { error: "End date is before start date." },
      { status: 400 },
    );
  }

  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM events WHERE id = ?")
    .get(slug);
  if (existing) {
    return NextResponse.json(
      { error: "Slug already in use." },
      { status: 409 },
    );
  }

  db.prepare(
    `INSERT INTO events (id, name, subtitle, start_date, end_date, visibility, commissioner_user_id, handicap_source)
     VALUES (?, ?, ?, ?, ?, 'public', ?, 'manual')`,
  ).run(
    slug,
    name,
    subtitle ?? null,
    start_date ?? null,
    end_date ?? null,
    user.id,
  );

  // Grant the creator commissioner role on the new event.
  assignRole(user.id, slug, "commissioner");

  return NextResponse.json({ ok: true, slug });
}
