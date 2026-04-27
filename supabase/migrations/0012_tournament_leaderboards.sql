-- 0012_tournament_leaderboards.sql
-- Tournament-style daily leaderboards. Each view exposes one row per
-- competitor with: gross strokes, holes thru, par thru, score-to-par,
-- and a rank ordered by score-to-par ascending (tournament convention).
-- Realtime updates flow through the same hole_scores publication, so
-- the UI can subscribe and rerank as birdies / bogeys land.

-- =========================================================================
-- v_day1_player_leaderboard
-- One row per player on Day 1. Score-to-par is computed against net
-- (gross minus strokes received on holes already played) so handicap
-- recipients aren't penalized while their stroke holes are still ahead.
-- =========================================================================

create or replace view public.v_day1_player_leaderboard as
with rd as (
  select id as round_id from public.rounds where day = 1
),
match_player as (
  -- Fan out each match into one row per player, carrying the receiver flag
  -- and the allocated stroke holes (only meaningful for the receiver).
  select
    s.match_id,
    s.round_id,
    s.match_number,
    s.player1_id as player_id,
    case when s.stroke_giver_id = s.player1_id then s.stroke_hole_numbers
         else array[]::int[] end as my_stroke_holes
  from public.v_day1_match_state s
  union all
  select
    s.match_id,
    s.round_id,
    s.match_number,
    s.player2_id,
    case when s.stroke_giver_id = s.player2_id then s.stroke_hole_numbers
         else array[]::int[] end
  from public.v_day1_match_state s
),
played as (
  select
    mp.player_id,
    mp.match_id,
    mp.round_id,
    coalesce(sum(hs.strokes), 0)::int as gross,
    count(hs.strokes)::int as holes_thru,
    coalesce(sum(h.par), 0)::int as par_thru,
    coalesce(
      sum(case when hs.hole_number = any(mp.my_stroke_holes) then 1 else 0 end),
      0
    )::int as strokes_received_thru
  from match_player mp
  left join public.hole_scores hs
    on hs.round_id = mp.round_id
   and hs.player_id = mp.player_id
  left join public.holes h
    on h.round_id = mp.round_id
   and h.hole_number = hs.hole_number
  group by mp.player_id, mp.match_id, mp.round_id
)
select
  pl.player_id,
  pl.match_id,
  pl.round_id,
  p.name as player_name,
  p.team_id,
  t.name as team_name,
  t.display_color,
  pl.gross,
  pl.holes_thru,
  pl.par_thru,
  pl.strokes_received_thru,
  (pl.gross - pl.strokes_received_thru) as net_thru,
  (pl.gross - pl.strokes_received_thru - pl.par_thru) as to_par,
  rank() over (
    order by
      (pl.gross - pl.strokes_received_thru - pl.par_thru) asc,
      pl.holes_thru desc,
      p.name asc
  ) as rank
from played pl
join public.players p on p.id = pl.player_id
join public.teams t on t.id = p.team_id
join rd on rd.round_id = pl.round_id;

-- =========================================================================
-- v_day2_entry_leaderboard
-- One row per scramble entry on Day 2 (10 entries: 5 teams × AD/BC pools).
-- Score-to-par uses the entry's gross (scramble pairs play one ball).
-- =========================================================================

create or replace view public.v_day2_entry_leaderboard as
with raw as (
  select
    se.id as entry_id,
    se.round_id,
    se.team_id,
    se.pool,
    coalesce(sum(hs.strokes), 0)::int as gross,
    count(hs.strokes)::int as holes_thru,
    coalesce(sum(h.par), 0)::int as par_thru
  from public.scramble_entries se
  join public.rounds r on r.id = se.round_id and r.day = 2
  left join public.hole_scores hs on hs.scramble_entry_id = se.id
  left join public.holes h
    on h.round_id = se.round_id
   and h.hole_number = hs.hole_number
  group by se.id, se.round_id, se.team_id, se.pool
)
select
  raw.entry_id,
  raw.round_id,
  raw.team_id,
  raw.pool,
  t.name as team_name,
  t.display_color,
  t.sort_order,
  raw.gross,
  raw.holes_thru,
  raw.par_thru,
  (raw.gross - raw.par_thru) as to_par,
  rank() over (
    order by
      (raw.gross - raw.par_thru) asc,
      raw.holes_thru desc,
      t.sort_order asc,
      raw.pool asc
  ) as rank
from raw
join public.teams t on t.id = raw.team_id;

-- =========================================================================
-- v_day3_entry_leaderboard
-- One row per scramble entry on Day 3 (5 entries, one per team).
-- =========================================================================

create or replace view public.v_day3_entry_leaderboard as
with raw as (
  select
    se.id as entry_id,
    se.round_id,
    se.team_id,
    coalesce(sum(hs.strokes), 0)::int as gross,
    count(hs.strokes)::int as holes_thru,
    coalesce(sum(h.par), 0)::int as par_thru
  from public.scramble_entries se
  join public.rounds r on r.id = se.round_id and r.day = 3
  left join public.hole_scores hs on hs.scramble_entry_id = se.id
  left join public.holes h
    on h.round_id = se.round_id
   and h.hole_number = hs.hole_number
  group by se.id, se.round_id, se.team_id
)
select
  raw.entry_id,
  raw.round_id,
  raw.team_id,
  t.name as team_name,
  t.display_color,
  t.sort_order,
  raw.gross,
  raw.holes_thru,
  raw.par_thru,
  (raw.gross - raw.par_thru) as to_par,
  rank() over (
    order by
      (raw.gross - raw.par_thru) asc,
      raw.holes_thru desc,
      t.sort_order asc
  ) as rank
from raw
join public.teams t on t.id = raw.team_id;
