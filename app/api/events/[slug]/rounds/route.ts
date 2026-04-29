import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, genId } from "@/lib/db";
import { checkCommissioner } from "@/lib/auth/eventPermissions";
import { getCourse, listHolesForCourse } from "@/lib/repo/courses";
import { FORMATS, type FormatId } from "@/lib/formats/registry";
import { emitChange } from "@/lib/events";

export const runtime = "nodejs";

const Body = z.object({
  day: z.number().int().min(1).max(3),
  course_id: z.string().min(1),
  format_id: z.enum(["match-play-net", "scramble-pair", "scramble-team"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD"),
  tee_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, "HH:MM (24-hour)")
    .transform((s) => (s.length === 5 ? `${s}:00` : s)),
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
  const { day, course_id, format_id, date, tee_time } = parsed.data;

  const course = getCourse(course_id);
  if (!course) {
    return NextResponse.json({ error: "Unknown course." }, { status: 400 });
  }

  const courseHoles = listHolesForCourse(course_id);
  if (courseHoles.length === 0) {
    return NextResponse.json(
      { error: "Course has no holes configured." },
      { status: 400 },
    );
  }

  const db = getDb();
  // UNIQUE(event_id, day) on rounds — preflight so the error message is
  // friendlier than the SQLite constraint message.
  const dayTaken = db
    .prepare("SELECT id FROM rounds WHERE event_id = ? AND day = ?")
    .get(slug, day);
  if (dayTaken) {
    return NextResponse.json(
      { error: `Day ${day} already has a round.` },
      { status: 409 },
    );
  }

  const legacyFormat = FORMATS[format_id as FormatId].legacy_format;
  const roundId = genId("rnd");

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO rounds (id, event_id, course_id, day, date, course_name, total_par, format, tee_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      roundId,
      slug,
      course_id,
      day,
      date,
      course.name,
      course.total_par,
      legacyFormat,
      tee_time,
    );
    const insHole = db.prepare(
      `INSERT INTO holes (id, round_id, hole_number, par, handicap_index, yardage)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    for (const h of courseHoles) {
      insHole.run(
        genId("h"),
        roundId,
        h.hole_number,
        h.par,
        h.handicap_index,
        h.yardage,
      );
    }
  });
  tx();

  emitChange("rounds", slug);
  return NextResponse.json({ ok: true, id: roundId });
}
