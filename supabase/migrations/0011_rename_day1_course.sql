-- 0011_rename_day1_course.sql
-- Day 1 is being played at Pinewild's Magnolia course, not the Holly course.
-- Update the existing round row so the course name reflects reality.

update public.rounds
   set course_name = 'Pinewild CC — Magnolia Course'
 where day = 1
   and course_name = 'Pinewild CC — Holly Course';
