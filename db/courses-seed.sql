-- Course library bootstrap. Idempotent — INSERT OR IGNORE so commissioner
-- edits to course rows survive re-boot. (Plan A · Phase 3a)
--
-- The first three courses are the N&P Invitational venues, lifted out of
-- the per-round seed so a future event can reuse them. Hole pars and
-- handicap indices match db/seed.sql exactly.

INSERT OR IGNORE INTO courses (id, name, location, total_par, hole_count) VALUES
  ('course-pinewild-magnolia', 'Pinewild CC — Magnolia Course', 'Pinehurst, NC', 72, 18),
  ('course-talamore',          'Talamore Golf Club',            'Southern Pines, NC', 71, 18),
  ('course-hyland',             'Hyland Golf Club',               'Southern Pines, NC', 72, 18);

-- ---------------------------------------------------------------------------
-- Pinewild Magnolia — pars known, handicap indices not yet filled in.
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO course_holes (course_id, hole_number, par, handicap_index) VALUES
  ('course-pinewild-magnolia',  1, 4, NULL), ('course-pinewild-magnolia',  2, 5, NULL),
  ('course-pinewild-magnolia',  3, 3, NULL), ('course-pinewild-magnolia',  4, 4, NULL),
  ('course-pinewild-magnolia',  5, 4, NULL), ('course-pinewild-magnolia',  6, 4, NULL),
  ('course-pinewild-magnolia',  7, 3, NULL), ('course-pinewild-magnolia',  8, 5, NULL),
  ('course-pinewild-magnolia',  9, 4, NULL), ('course-pinewild-magnolia', 10, 4, NULL),
  ('course-pinewild-magnolia', 11, 4, NULL), ('course-pinewild-magnolia', 12, 3, NULL),
  ('course-pinewild-magnolia', 13, 5, NULL), ('course-pinewild-magnolia', 14, 4, NULL),
  ('course-pinewild-magnolia', 15, 4, NULL), ('course-pinewild-magnolia', 16, 4, NULL),
  ('course-pinewild-magnolia', 17, 3, NULL), ('course-pinewild-magnolia', 18, 5, NULL);

-- ---------------------------------------------------------------------------
-- Talamore — par 71.
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO course_holes (course_id, hole_number, par, handicap_index) VALUES
  ('course-talamore',  1, 5,  4), ('course-talamore',  2, 3, 16),
  ('course-talamore',  3, 4,  6), ('course-talamore',  4, 5, 14),
  ('course-talamore',  5, 3, 18), ('course-talamore',  6, 4, 12),
  ('course-talamore',  7, 4,  2), ('course-talamore',  8, 4,  8),
  ('course-talamore',  9, 4, 10), ('course-talamore', 10, 4,  7),
  ('course-talamore', 11, 5, 15), ('course-talamore', 12, 4,  5),
  ('course-talamore', 13, 3, 17), ('course-talamore', 14, 4,  9),
  ('course-talamore', 15, 3, 13), ('course-talamore', 16, 4,  1),
  ('course-talamore', 17, 4, 11), ('course-talamore', 18, 4,  3);

-- ---------------------------------------------------------------------------
-- Hyland — par 72.
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO course_holes (course_id, hole_number, par, handicap_index) VALUES
  ('course-hyland',  1, 4, 11), ('course-hyland',  2, 4,  7),
  ('course-hyland',  3, 3, 17), ('course-hyland',  4, 4,  1),
  ('course-hyland',  5, 4,  5), ('course-hyland',  6, 3, 15),
  ('course-hyland',  7, 5,  9), ('course-hyland',  8, 4, 13),
  ('course-hyland',  9, 5,  3), ('course-hyland', 10, 3, 16),
  ('course-hyland', 11, 4, 10), ('course-hyland', 12, 5,  2),
  ('course-hyland', 13, 3, 14), ('course-hyland', 14, 4,  8),
  ('course-hyland', 15, 4,  6), ('course-hyland', 16, 4, 18),
  ('course-hyland', 17, 5,  4), ('course-hyland', 18, 4, 12);

-- Backfill: link the existing N&P rounds to their library entries so a
-- round.course_id reference exists for every event-1 round. Idempotent;
-- only writes if course_id is currently NULL.
UPDATE rounds SET course_id = 'course-pinewild-magnolia'
  WHERE id = 'round-1' AND course_id IS NULL;
UPDATE rounds SET course_id = 'course-talamore'
  WHERE id = 'round-2' AND course_id IS NULL;
UPDATE rounds SET course_id = 'course-hyland'
  WHERE id = 'round-3' AND course_id IS NULL;
