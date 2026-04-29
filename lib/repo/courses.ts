import "server-only";
import { getDb, genId } from "@/lib/db";
import type {
  CourseHoleRow,
  CourseRow,
  CourseTeeBoxRow,
} from "@/lib/types";

// Course library is global, not event-scoped. Every event chooses from the
// same shared catalog; round.course_id is a snapshot pointer back to the
// catalog entry chosen at round-creation time. (Plan A · Phase 3a)

export function listCourses(): CourseRow[] {
  return getDb()
    .prepare("SELECT * FROM courses ORDER BY name COLLATE NOCASE")
    .all() as CourseRow[];
}

export function getCourse(id: string): CourseRow | null {
  return (
    (getDb()
      .prepare("SELECT * FROM courses WHERE id = ?")
      .get(id) as CourseRow) ?? null
  );
}

export function listHolesForCourse(courseId: string): CourseHoleRow[] {
  return getDb()
    .prepare(
      "SELECT * FROM course_holes WHERE course_id = ? ORDER BY hole_number",
    )
    .all(courseId) as CourseHoleRow[];
}

export function listTeeBoxesForCourse(
  courseId: string,
): CourseTeeBoxRow[] {
  return getDb()
    .prepare(
      "SELECT * FROM course_tee_boxes WHERE course_id = ? ORDER BY sort_order, rating DESC",
    )
    .all(courseId) as CourseTeeBoxRow[];
}

export type CreateCourseInput = {
  name: string;
  location?: string | null;
  total_par: number;
  hole_count?: 9 | 18;
  holes: Array<{
    hole_number: number;
    par: number;
    handicap_index?: number | null;
    yardage?: number | null;
  }>;
  tee_boxes?: Array<{
    name: string;
    rating: number;
    slope: number;
    total_yards?: number | null;
    sort_order?: number;
  }>;
};

// Insert a course + its hole list + (optional) tee boxes atomically. Used
// by the commissioner setup wizard in Phase 3b. The caller is responsible
// for slug-style ids on tee boxes; we generate them with the 'tb' prefix.
export function createCourse(input: CreateCourseInput): CourseRow {
  const db = getDb();
  const id = genId("course");
  const tx = db.transaction((inp: CreateCourseInput) => {
    db.prepare(
      `INSERT INTO courses (id, name, location, total_par, hole_count)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(
      id,
      inp.name,
      inp.location ?? null,
      inp.total_par,
      inp.hole_count ?? 18,
    );
    const insHole = db.prepare(
      `INSERT INTO course_holes (course_id, hole_number, par, handicap_index, yardage)
       VALUES (?, ?, ?, ?, ?)`,
    );
    for (const h of inp.holes) {
      insHole.run(
        id,
        h.hole_number,
        h.par,
        h.handicap_index ?? null,
        h.yardage ?? null,
      );
    }
    if (inp.tee_boxes?.length) {
      const insTb = db.prepare(
        `INSERT INTO course_tee_boxes (id, course_id, name, rating, slope, total_yards, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      );
      for (const tb of inp.tee_boxes) {
        insTb.run(
          genId("tb"),
          id,
          tb.name,
          tb.rating,
          tb.slope,
          tb.total_yards ?? null,
          tb.sort_order ?? 0,
        );
      }
    }
  });
  tx(input);
  return getCourse(id)!;
}
