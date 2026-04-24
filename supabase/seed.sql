-- seed.sql — The Neal & Pam Invitational
-- Idempotent-ish: deletes all domain rows first, then re-inserts.
-- Run once after applying migrations 0001..0010.
--
-- NOTE: this seed is safe to re-run. It does NOT touch auth.users or
-- the player→user link; it preserves existing user_id and is_admin flags
-- by re-inserting only players who don't already exist. If you need to
-- reset completely, truncate all tables manually.

begin;

-- ------------------------------------------------------------------
-- Teams
-- ------------------------------------------------------------------
insert into public.teams (name, display_color, sort_order) values
  ('Team 1', '#A83232', 1),
  ('Team 2', '#2F5233', 2),
  ('Team 3', '#2D4E8A', 3),
  ('Team 4', '#B07324', 4),
  ('Team 5', '#5B2B4C', 5)
on conflict do nothing;

-- ------------------------------------------------------------------
-- Players
-- ------------------------------------------------------------------
with team_ids as (
  select id, name from public.teams
)
insert into public.players (name, handicap, team_id, team_slot, is_admin)
select p.name, p.handicap, t.id, p.team_slot, p.is_admin
from (values
  ('Reid',    2.9::numeric, 'Team 1', 'A', true),
  ('Tom',    12.9::numeric, 'Team 1', 'B', false),
  ('Luke',   14.9::numeric, 'Team 1', 'C', false),
  ('Bot',    34.9::numeric, 'Team 1', 'D', false),
  ('Pincus',  6.7::numeric, 'Team 2', 'A', false),
  ('Byrnes', 12.1::numeric, 'Team 2', 'B', false),
  ('Foley',  15.0::numeric, 'Team 2', 'C', false),
  ('Matkins',23.6::numeric, 'Team 2', 'D', false),
  ('Ham',     7.3::numeric, 'Team 3', 'A', false),
  ('Ric',    11.0::numeric, 'Team 3', 'B', false),
  ('Davis',  15.2::numeric, 'Team 3', 'C', false),
  ('Mallen', 23.0::numeric, 'Team 3', 'D', false),
  ('Nate',    7.4::numeric, 'Team 4', 'A', false),
  ('McArdle',10.8::numeric, 'Team 4', 'B', false),
  ('Bands',  15.2::numeric, 'Team 4', 'C', false),
  ('Mason',  21.3::numeric, 'Team 4', 'D', false),
  ('Keller',  7.6::numeric, 'Team 5', 'A', false),
  ('Mellis',  9.0::numeric, 'Team 5', 'B', false),
  ('Bennett',19.8::numeric, 'Team 5', 'C', false),
  ('Cota',   20.0::numeric, 'Team 5', 'D', false)
) as p(name, handicap, team_name, team_slot, is_admin)
join team_ids t on t.name = p.team_name
on conflict (name) do nothing;

-- ------------------------------------------------------------------
-- Rounds
-- ------------------------------------------------------------------
insert into public.rounds (day, date, course_name, total_par, format, tee_time) values
  (1, '2026-05-07', 'Pinewild CC — Holly Course', 72, 'singles',       '10:21:00'),
  (2, '2026-05-08', 'Talamore Golf Club',         71, 'scramble_2man', '08:45:00'),
  (3, '2026-05-09', 'Hyland Golf Club',           72, 'scramble_4man', '10:00:00')
on conflict (day) do nothing;

-- ------------------------------------------------------------------
-- Holes — Day 1 Pinewild Holly (placeholder)
-- PLACEHOLDER: Pinewild Holly hole-level data will be filled in at the
-- pro shop on 5/7. Admin UI allows updating par + handicap_index per hole.
-- Day 1 stroke allocation will re-compute when handicap_index values are populated.
-- ------------------------------------------------------------------
with r as (select id from public.rounds where day = 1)
insert into public.holes (round_id, hole_number, par, handicap_index)
select r.id, v.hole_number, v.par, null::int
from r,
(values
  (1, 4), (2, 5), (3, 3), (4, 4), (5, 4), (6, 4),
  (7, 3), (8, 5), (9, 4), (10, 4), (11, 4), (12, 3),
  (13, 5), (14, 4), (15, 4), (16, 4), (17, 3), (18, 5)
) as v(hole_number, par)
on conflict (round_id, hole_number) do nothing;

-- ------------------------------------------------------------------
-- Holes — Day 2 Talamore
-- ------------------------------------------------------------------
with r as (select id from public.rounds where day = 2)
insert into public.holes (round_id, hole_number, par, handicap_index)
select r.id, v.hole_number, v.par, v.hdcp
from r,
(values
  (1, 5, 4), (2, 3, 16), (3, 4, 6), (4, 5, 14), (5, 3, 18),
  (6, 4, 12), (7, 4, 2), (8, 4, 8), (9, 4, 10),
  (10, 4, 7), (11, 5, 15), (12, 4, 5), (13, 3, 17),
  (14, 4, 9), (15, 3, 13), (16, 4, 1), (17, 4, 11), (18, 4, 3)
) as v(hole_number, par, hdcp)
on conflict (round_id, hole_number) do nothing;

-- ------------------------------------------------------------------
-- Holes — Day 3 Hyland
-- ------------------------------------------------------------------
with r as (select id from public.rounds where day = 3)
insert into public.holes (round_id, hole_number, par, handicap_index)
select r.id, v.hole_number, v.par, v.hdcp
from r,
(values
  (1, 4, 11), (2, 4, 7), (3, 3, 17), (4, 4, 1), (5, 4, 5),
  (6, 3, 15), (7, 5, 9), (8, 4, 13), (9, 5, 3),
  (10, 3, 16), (11, 4, 10), (12, 5, 2), (13, 3, 14),
  (14, 4, 8), (15, 4, 6), (16, 4, 18), (17, 5, 4), (18, 4, 12)
) as v(hole_number, par, hdcp)
on conflict (round_id, hole_number) do nothing;

-- ------------------------------------------------------------------
-- Matches — Day 1 singles
-- Stroke allocation is computed per §10.2 against current handicaps.
-- Since Holly's handicap_index is null at seed time, strokeHoles is
-- unknown — we still store strokes_given and stroke_giver so the view
-- can compute nets once Holly's hdcp indexes are populated.
-- ------------------------------------------------------------------
with
  r as (select id from public.rounds where day = 1),
  p as (select id, name from public.players),
  m as (
    -- (match_number, p1_name, p2_name, giver_name or null, strokes_given)
    -- Values per §10.7 Required test table.
    select * from (values
      ( 1, 'Reid',    'Pincus',  'Pincus',  4),
      ( 2, 'Tom',     'Ham',     'Tom',     6),
      ( 3, 'Luke',    'Bands',   null::text, 0),
      ( 4, 'Bot',     'Bennett', 'Bot',    11),
      ( 5, 'Foley',   'Davis',   null::text, 0),
      ( 6, 'Byrnes',  'McArdle', null::text, 0),
      ( 7, 'Matkins', 'Cota',    'Matkins', 4),
      ( 8, 'Mallen',  'Mason',   'Mallen',  2),
      ( 9, 'Ric',     'Mellis',  'Ric',     2),
      (10, 'Nate',    'Keller',  null::text, 0)
    ) as v(match_number, p1_name, p2_name, giver_name, strokes_given)
  )
insert into public.matches (round_id, match_number, player1_id, player2_id, stroke_giver_id, strokes_given)
select r.id, m.match_number, p1.id, p2.id, pg.id, m.strokes_given
from r, m
join p p1 on p1.name = m.p1_name
join p p2 on p2.name = m.p2_name
left join p pg on pg.name = m.giver_name
on conflict (round_id, match_number) do nothing;

-- ------------------------------------------------------------------
-- Scramble entries — Day 2 (AD and BC pools)
-- ------------------------------------------------------------------
with
  r as (select id from public.rounds where day = 2),
  t as (select id, name from public.teams)
insert into public.scramble_entries (round_id, team_id, pool)
select r.id, t.id, v.pool
from r,
(values
  ('Team 1', 'AD'), ('Team 1', 'BC'),
  ('Team 2', 'AD'), ('Team 2', 'BC'),
  ('Team 3', 'AD'), ('Team 3', 'BC'),
  ('Team 4', 'AD'), ('Team 4', 'BC'),
  ('Team 5', 'AD'), ('Team 5', 'BC')
) as v(team_name, pool)
join t on t.name = v.team_name
on conflict (round_id, team_id, pool) do nothing;

-- Participants for Day 2
with
  r as (select id from public.rounds where day = 2),
  p as (select id, name from public.players),
  t as (select id, name from public.teams),
  assign as (
    select * from (values
      ('Team 1', 'AD', 'Reid'),    ('Team 1', 'AD', 'Bot'),
      ('Team 1', 'BC', 'Tom'),     ('Team 1', 'BC', 'Luke'),
      ('Team 2', 'AD', 'Pincus'),  ('Team 2', 'AD', 'Matkins'),
      ('Team 2', 'BC', 'Byrnes'),  ('Team 2', 'BC', 'Foley'),
      ('Team 3', 'AD', 'Ham'),     ('Team 3', 'AD', 'Mallen'),
      ('Team 3', 'BC', 'Ric'),     ('Team 3', 'BC', 'Davis'),
      ('Team 4', 'AD', 'Nate'),    ('Team 4', 'AD', 'Mason'),
      ('Team 4', 'BC', 'McArdle'), ('Team 4', 'BC', 'Bands'),
      ('Team 5', 'AD', 'Keller'),  ('Team 5', 'AD', 'Cota'),
      ('Team 5', 'BC', 'Mellis'),  ('Team 5', 'BC', 'Bennett')
    ) as v(team_name, pool, player_name)
  )
insert into public.scramble_participants (scramble_entry_id, player_id)
select se.id, p.id
from assign a
join r on true
join t on t.name = a.team_name
join p on p.name = a.player_name
join public.scramble_entries se
  on se.round_id = r.id and se.team_id = t.id and se.pool = a.pool
on conflict do nothing;

-- ------------------------------------------------------------------
-- Scramble entries — Day 3 (one per team, all four players)
-- ------------------------------------------------------------------
with
  r as (select id from public.rounds where day = 3),
  t as (select id, name from public.teams)
insert into public.scramble_entries (round_id, team_id, pool)
select r.id, t.id, null::text
from r, t
on conflict (round_id, team_id, pool) do nothing;

with
  r as (select id from public.rounds where day = 3),
  p as (select id, team_id from public.players)
insert into public.scramble_participants (scramble_entry_id, player_id)
select se.id, p.id
from r
cross join public.scramble_entries se
join p on p.team_id = se.team_id
where se.round_id = r.id and se.pool is null
on conflict do nothing;

commit;
