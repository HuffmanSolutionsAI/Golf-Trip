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
-- Pinewild Magnolia — Blue Tees · Par 72 · 6856 yds · Rating 73.8 / Slope 134.
-- Verified against the club's published Blue scorecard.
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO course_holes (course_id, hole_number, par, handicap_index) VALUES
  ('course-pinewild-magnolia',  1, 5,  1), ('course-pinewild-magnolia',  2, 4, 11),
  ('course-pinewild-magnolia',  3, 3, 17), ('course-pinewild-magnolia',  4, 4, 13),
  ('course-pinewild-magnolia',  5, 4,  5), ('course-pinewild-magnolia',  6, 4,  9),
  ('course-pinewild-magnolia',  7, 3, 15), ('course-pinewild-magnolia',  8, 5,  3),
  ('course-pinewild-magnolia',  9, 4,  7), ('course-pinewild-magnolia', 10, 4, 12),
  ('course-pinewild-magnolia', 11, 4,  8), ('course-pinewild-magnolia', 12, 3, 18),
  ('course-pinewild-magnolia', 13, 5,  2), ('course-pinewild-magnolia', 14, 4,  4),
  ('course-pinewild-magnolia', 15, 3, 16), ('course-pinewild-magnolia', 16, 4, 14),
  ('course-pinewild-magnolia', 17, 4, 10), ('course-pinewild-magnolia', 18, 5,  6);

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

-- ---------------------------------------------------------------------------
-- Heal: Pinewild Magnolia previously had placeholder pars on holes 1, 2, 15
-- and 17 and no handicap indices. Re-apply the verified Blue Tees scorecard
-- so deployed DBs catch up on the next boot without db:reset. Updates are
-- safe to re-run — same target values every time.
-- ---------------------------------------------------------------------------
UPDATE course_holes SET par = 5, handicap_index =  1 WHERE course_id = 'course-pinewild-magnolia' AND hole_number =  1;
UPDATE course_holes SET par = 4, handicap_index = 11 WHERE course_id = 'course-pinewild-magnolia' AND hole_number =  2;
UPDATE course_holes SET par = 3, handicap_index = 17 WHERE course_id = 'course-pinewild-magnolia' AND hole_number =  3;
UPDATE course_holes SET par = 4, handicap_index = 13 WHERE course_id = 'course-pinewild-magnolia' AND hole_number =  4;
UPDATE course_holes SET par = 4, handicap_index =  5 WHERE course_id = 'course-pinewild-magnolia' AND hole_number =  5;
UPDATE course_holes SET par = 4, handicap_index =  9 WHERE course_id = 'course-pinewild-magnolia' AND hole_number =  6;
UPDATE course_holes SET par = 3, handicap_index = 15 WHERE course_id = 'course-pinewild-magnolia' AND hole_number =  7;
UPDATE course_holes SET par = 5, handicap_index =  3 WHERE course_id = 'course-pinewild-magnolia' AND hole_number =  8;
UPDATE course_holes SET par = 4, handicap_index =  7 WHERE course_id = 'course-pinewild-magnolia' AND hole_number =  9;
UPDATE course_holes SET par = 4, handicap_index = 12 WHERE course_id = 'course-pinewild-magnolia' AND hole_number = 10;
UPDATE course_holes SET par = 4, handicap_index =  8 WHERE course_id = 'course-pinewild-magnolia' AND hole_number = 11;
UPDATE course_holes SET par = 3, handicap_index = 18 WHERE course_id = 'course-pinewild-magnolia' AND hole_number = 12;
UPDATE course_holes SET par = 5, handicap_index =  2 WHERE course_id = 'course-pinewild-magnolia' AND hole_number = 13;
UPDATE course_holes SET par = 4, handicap_index =  4 WHERE course_id = 'course-pinewild-magnolia' AND hole_number = 14;
UPDATE course_holes SET par = 3, handicap_index = 16 WHERE course_id = 'course-pinewild-magnolia' AND hole_number = 15;
UPDATE course_holes SET par = 4, handicap_index = 14 WHERE course_id = 'course-pinewild-magnolia' AND hole_number = 16;
UPDATE course_holes SET par = 4, handicap_index = 10 WHERE course_id = 'course-pinewild-magnolia' AND hole_number = 17;
UPDATE course_holes SET par = 5, handicap_index =  6 WHERE course_id = 'course-pinewild-magnolia' AND hole_number = 18;

-- Mirror the same correction onto the live round-1 holes so existing DBs
-- pick up the change. The holes table is initial-only via seed.sql, so this
-- heal block is what propagates the fix to a running deployment.
UPDATE holes SET par = 5, handicap_index =  1 WHERE round_id = 'round-1' AND hole_number =  1;
UPDATE holes SET par = 4, handicap_index = 11 WHERE round_id = 'round-1' AND hole_number =  2;
UPDATE holes SET par = 3, handicap_index = 17 WHERE round_id = 'round-1' AND hole_number =  3;
UPDATE holes SET par = 4, handicap_index = 13 WHERE round_id = 'round-1' AND hole_number =  4;
UPDATE holes SET par = 4, handicap_index =  5 WHERE round_id = 'round-1' AND hole_number =  5;
UPDATE holes SET par = 4, handicap_index =  9 WHERE round_id = 'round-1' AND hole_number =  6;
UPDATE holes SET par = 3, handicap_index = 15 WHERE round_id = 'round-1' AND hole_number =  7;
UPDATE holes SET par = 5, handicap_index =  3 WHERE round_id = 'round-1' AND hole_number =  8;
UPDATE holes SET par = 4, handicap_index =  7 WHERE round_id = 'round-1' AND hole_number =  9;
UPDATE holes SET par = 4, handicap_index = 12 WHERE round_id = 'round-1' AND hole_number = 10;
UPDATE holes SET par = 4, handicap_index =  8 WHERE round_id = 'round-1' AND hole_number = 11;
UPDATE holes SET par = 3, handicap_index = 18 WHERE round_id = 'round-1' AND hole_number = 12;
UPDATE holes SET par = 5, handicap_index =  2 WHERE round_id = 'round-1' AND hole_number = 13;
UPDATE holes SET par = 4, handicap_index =  4 WHERE round_id = 'round-1' AND hole_number = 14;
UPDATE holes SET par = 3, handicap_index = 16 WHERE round_id = 'round-1' AND hole_number = 15;
UPDATE holes SET par = 4, handicap_index = 14 WHERE round_id = 'round-1' AND hole_number = 16;
UPDATE holes SET par = 4, handicap_index = 10 WHERE round_id = 'round-1' AND hole_number = 17;
UPDATE holes SET par = 5, handicap_index =  6 WHERE round_id = 'round-1' AND hole_number = 18;
