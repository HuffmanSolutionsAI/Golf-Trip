-- 0009_views.sql
-- Derived views. The TypeScript scoring engine (lib/scoring) is the reference;
-- these views mirror its logic for realtime leaderboard queries.

-- =========================================================================
-- v_round_progress
-- =========================================================================

create or replace view public.v_round_progress as
with expected as (
  select
    r.id as round_id,
    r.day,
    r.format,
    case r.format
      when 'singles'       then 10 * 18 * 2   -- 10 matches × 18 × 2 players
      when 'scramble_2man' then 10 * 18       -- 10 entries × 18
      when 'scramble_4man' then 5  * 18       -- 5 entries × 18
    end as expected_count
  from public.rounds r
),
entered as (
  select round_id, count(*) as entered_count
  from public.hole_scores
  group by round_id
)
select
  e.round_id,
  e.day,
  e.format,
  e.expected_count,
  coalesce(en.entered_count, 0) as entered_count,
  case when e.expected_count = 0 then 0
       else round( (coalesce(en.entered_count, 0)::numeric / e.expected_count) * 100, 1)
  end as percent_complete,
  coalesce(en.entered_count, 0) >= e.expected_count as is_complete
from expected e
left join entered en on en.round_id = e.round_id;

-- =========================================================================
-- v_day1_match_state
-- Per match: hole-by-hole net totals, winner, team points awarded.
-- =========================================================================

create or replace view public.v_day1_match_state as
with match_holes as (
  select
    m.id as match_id,
    m.round_id,
    m.match_number,
    m.player1_id,
    m.player2_id,
    m.stroke_giver_id,
    m.strokes_given,
    h.hole_number,
    h.par,
    h.handicap_index
  from public.matches m
  join public.rounds r on r.id = m.round_id
  join public.holes h on h.round_id = r.id
),
stroke_holes as (
  -- For each match, compute which hole_numbers receive a stroke.
  -- If handicap_index is null on any hole in the round, we return no
  -- stroke holes (matches the TS engine's "pending index data" behavior).
  select
    m.id as match_id,
    m.stroke_giver_id,
    m.strokes_given,
    case
      when m.strokes_given = 0 then array[]::int[]
      when exists (
        select 1 from public.holes h
        where h.round_id = m.round_id and h.handicap_index is null
      ) then array[]::int[]
      else (
        select coalesce(array_agg(h.hole_number order by h.hole_number), array[]::int[])
        from (
          select hole_number
          from public.holes h
          where h.round_id = m.round_id
          order by h.handicap_index asc
          limit m.strokes_given
        ) h
      )
    end as stroke_hole_numbers
  from public.matches m
),
scored as (
  select
    m.id as match_id,
    m.round_id,
    m.match_number,
    m.player1_id,
    m.player2_id,
    m.stroke_giver_id,
    m.strokes_given,
    sh.stroke_hole_numbers,
    s1.p1_strokes,
    s2.p2_strokes,
    count_scores.p1_holes,
    count_scores2.p2_holes
  from public.matches m
  join stroke_holes sh on sh.match_id = m.id
  left join lateral (
    select coalesce(sum(strokes), 0) as p1_strokes
    from public.hole_scores hs
    where hs.round_id = m.round_id and hs.player_id = m.player1_id
  ) s1 on true
  left join lateral (
    select coalesce(sum(strokes), 0) as p2_strokes
    from public.hole_scores hs
    where hs.round_id = m.round_id and hs.player_id = m.player2_id
  ) s2 on true
  left join lateral (
    select count(*) as p1_holes from public.hole_scores hs
    where hs.round_id = m.round_id and hs.player_id = m.player1_id
  ) count_scores on true
  left join lateral (
    select count(*) as p2_holes from public.hole_scores hs
    where hs.round_id = m.round_id and hs.player_id = m.player2_id
  ) count_scores2 on true
),
nets as (
  select
    s.*,
    case when s.stroke_giver_id = s.player1_id
         then s.p1_strokes - coalesce(array_length(s.stroke_hole_numbers, 1), 0)
         else s.p1_strokes end as p1_total_net_raw,
    case when s.stroke_giver_id = s.player2_id
         then s.p2_strokes - coalesce(array_length(s.stroke_hole_numbers, 1), 0)
         else s.p2_strokes end as p2_total_net_raw
  from scored s
),
holes_up as (
  select
    n.match_id,
    -- Running "holes up" for display — compute net-per-hole running diff.
    -- Positive = p1 up. Uses greatest hole_number reached on either side.
    (
      select coalesce(sum(
        case
          when p1_net < p2_net then 1
          when p1_net > p2_net then -1
          else 0
        end
      ), 0)
      from (
        select
          hn,
          coalesce(
            (select hs.strokes from public.hole_scores hs
              where hs.round_id = n.round_id and hs.player_id = n.player1_id and hs.hole_number = hn),
            0
          )
          - case when n.stroke_giver_id = n.player1_id and hn = any(n.stroke_hole_numbers) then 1 else 0 end
          as p1_net,
          coalesce(
            (select hs.strokes from public.hole_scores hs
              where hs.round_id = n.round_id and hs.player_id = n.player2_id and hs.hole_number = hn),
            0
          )
          - case when n.stroke_giver_id = n.player2_id and hn = any(n.stroke_hole_numbers) then 1 else 0 end
          as p2_net
        from generate_series(1, 18) hn
        where
          exists (select 1 from public.hole_scores hs where hs.round_id = n.round_id and hs.player_id = n.player1_id and hs.hole_number = hn)
          and
          exists (select 1 from public.hole_scores hs where hs.round_id = n.round_id and hs.player_id = n.player2_id and hs.hole_number = hn)
      ) both_scored
    ) as current_holes_up
  from nets n
)
select
  n.match_id,
  n.round_id,
  n.match_number,
  n.player1_id,
  n.player2_id,
  n.stroke_giver_id,
  n.strokes_given,
  n.stroke_hole_numbers,
  n.p1_strokes as p1_total_gross,
  n.p2_strokes as p2_total_gross,
  n.p1_total_net_raw as p1_total_net,
  n.p2_total_net_raw as p2_total_net,
  n.p1_holes,
  n.p2_holes,
  least(n.p1_holes, n.p2_holes) as holes_both_played,
  hu.current_holes_up,
  case
    when n.p1_holes = 18 and n.p2_holes = 18 then 'final'::text
    when n.p1_holes = 0 and n.p2_holes = 0 then 'pending'::text
    else 'in_progress'::text
  end as status,
  case
    when n.p1_holes = 18 and n.p2_holes = 18 then
      case when n.p1_total_net_raw < n.p2_total_net_raw then n.player1_id
           when n.p2_total_net_raw < n.p1_total_net_raw then n.player2_id
           else null end
    else null end as winner_player_id,
  case
    when n.p1_holes = 18 and n.p2_holes = 18 then
      case when n.p1_total_net_raw < n.p2_total_net_raw then 2
           when n.p1_total_net_raw = n.p2_total_net_raw then 1
           else 0 end
    else 0 end as p1_team_points,
  case
    when n.p1_holes = 18 and n.p2_holes = 18 then
      case when n.p2_total_net_raw < n.p1_total_net_raw then 2
           when n.p1_total_net_raw = n.p2_total_net_raw then 1
           else 0 end
    else 0 end as p2_team_points
from nets n
left join holes_up hu on hu.match_id = n.match_id;

-- =========================================================================
-- v_day2_pool_ranks
-- =========================================================================

create or replace view public.v_day2_pool_ranks as
with raw as (
  select
    se.id as entry_id,
    se.round_id,
    se.team_id,
    se.pool,
    se.manual_tiebreak_rank,
    coalesce(sum(hs.strokes), 0) as team_raw,
    count(hs.strokes) as holes_thru
  from public.scramble_entries se
  join public.rounds r on r.id = se.round_id and r.day = 2
  left join public.hole_scores hs on hs.scramble_entry_id = se.id
  group by se.id, se.round_id, se.team_id, se.pool, se.manual_tiebreak_rank
),
pool_complete as (
  select
    pool,
    round_id,
    bool_and(holes_thru = 18) as is_complete
  from raw
  group by pool, round_id
),
ranked as (
  select
    r.*,
    pc.is_complete,
    -- Natural rank: ascending by raw within pool.
    dense_rank() over (partition by r.pool order by r.team_raw asc, r.entry_id) as natural_rank,
    -- If manual_tiebreak_rank is set on any entry in this pool, prefer that ordering.
    rank() over (partition by r.pool order by coalesce(r.manual_tiebreak_rank, 999), r.team_raw asc) as manual_rank
  from raw r
  left join pool_complete pc on pc.pool = r.pool and pc.round_id = r.round_id
)
select
  entry_id,
  round_id,
  team_id,
  pool,
  manual_tiebreak_rank,
  team_raw,
  holes_thru,
  case when manual_tiebreak_rank is not null then manual_tiebreak_rank
       else natural_rank end as rank_in_pool,
  case
    when is_complete then
      case (case when manual_tiebreak_rank is not null then manual_tiebreak_rank else natural_rank end)
        when 1 then 5
        when 2 then 3
        when 3 then 1
        else 0
      end
    else 0
  end as points,
  not coalesce(is_complete, false) as projected
from ranked;

-- =========================================================================
-- v_day3_standings
-- =========================================================================

create or replace view public.v_day3_standings as
with raw as (
  select
    se.id as entry_id,
    se.round_id,
    se.team_id,
    coalesce(sum(hs.strokes), 0) as team_raw,
    count(hs.strokes) as holes_thru,
    coalesce(
      sum(
        case when hs.hole_number is not null
          then (select h.par from public.holes h
                  where h.round_id = se.round_id and h.hole_number = hs.hole_number)
          else 0 end
      ), 0
    ) as par_thru
  from public.scramble_entries se
  join public.rounds r on r.id = se.round_id and r.day = 3
  left join public.hole_scores hs on hs.scramble_entry_id = se.id
  group by se.id, se.round_id, se.team_id
),
complete as (
  select round_id, bool_and(holes_thru = 18) as is_complete
  from raw
  group by round_id
),
ranked as (
  select
    r.*,
    c.is_complete,
    rank() over (order by r.team_raw asc) as natural_rank
  from raw r
  left join complete c on c.round_id = r.round_id
)
select
  entry_id,
  round_id,
  team_id,
  team_raw,
  holes_thru,
  par_thru,
  greatest(0, par_thru - team_raw) as under_par,
  natural_rank as rank,
  case
    when is_complete then
      case natural_rank when 1 then 8 when 2 then 6 when 3 then 4 when 4 then 2 else 0 end
    else 0
  end as placement_points,
  case when is_complete then greatest(0, par_thru - team_raw) else 0 end as bonus_points,
  case when is_complete
       then (case natural_rank when 1 then 8 when 2 then 6 when 3 then 4 when 4 then 2 else 0 end)
            + greatest(0, par_thru - team_raw)
       else 0
  end as total_points,
  not coalesce(is_complete, false) as projected
from ranked;

-- =========================================================================
-- v_team_points
-- =========================================================================

create or replace view public.v_team_points as
with
day1 as (
  select
    p.team_id,
    sum(
      case when mstate.player1_id = p.id then mstate.p1_team_points
           when mstate.player2_id = p.id then mstate.p2_team_points
           else 0 end
    ) as pts
  from public.players p
  cross join public.v_day1_match_state mstate
  where mstate.player1_id = p.id or mstate.player2_id = p.id
  group by p.team_id
),
day2 as (
  select team_id, coalesce(sum(points), 0) as pts
  from public.v_day2_pool_ranks
  group by team_id
),
day3 as (
  select team_id, coalesce(sum(total_points), 0) as pts
  from public.v_day3_standings
  group by team_id
)
select
  t.id as team_id,
  t.name,
  t.display_color,
  t.sort_order,
  coalesce(d1.pts, 0) as day1_points,
  coalesce(d2.pts, 0) as day2_points,
  coalesce(d3.pts, 0) as day3_points,
  coalesce(d1.pts, 0) + coalesce(d2.pts, 0) + coalesce(d3.pts, 0) as total_points
from public.teams t
left join day1 d1 on d1.team_id = t.id
left join day2 d2 on d2.team_id = t.id
left join day3 d3 on d3.team_id = t.id;

-- =========================================================================
-- v_leaderboard
-- =========================================================================

create or replace view public.v_leaderboard as
with progress as (
  select
    bool_or(not is_complete) as any_projected,
    count(*) filter (where is_complete) as complete_days,
    max(day) filter (where is_complete) as max_complete_day,
    min(day) filter (where not is_complete) as next_live_day
  from public.v_round_progress
)
select
  tp.team_id,
  tp.name,
  tp.display_color,
  tp.sort_order,
  tp.day1_points,
  tp.day2_points,
  tp.day3_points,
  tp.total_points,
  rank() over (order by tp.total_points desc, tp.sort_order asc) as rank,
  pg.any_projected as is_projected,
  case
    when pg.complete_days = 3 then 'Final'
    when pg.next_live_day is not null then 'Live · Day ' || pg.next_live_day
    when pg.max_complete_day is not null then 'Thru Day ' || pg.max_complete_day
    else 'Upcoming'
  end as status_label
from public.v_team_points tp
cross join progress pg
order by rank asc;
