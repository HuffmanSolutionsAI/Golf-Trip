import "server-only";
import {
  listMatches,
  listScrambleEntries,
  listAllScores,
  listScrambleParticipants,
} from "./scores";
import { listPlayers, listTeams } from "./players";
import { listRounds, listAllHoles } from "./rounds";
import { computeStrokeAllocation } from "@/lib/scoring/handicaps";
import { computeDay1MatchResult } from "@/lib/scoring/day1";
import { computeDay2PoolRanks } from "@/lib/scoring/day2";
import { computeDay3Standings } from "@/lib/scoring/day3";
import type {
  Day1MatchStateRow,
  Day2PoolRankRow,
  Day3StandingsRow,
  HoleScoreRow,
  LeaderboardRow,
} from "@/lib/types";

type Snapshot = {
  rounds: ReturnType<typeof listRounds>;
  holes: ReturnType<typeof listAllHoles>;
  players: ReturnType<typeof listPlayers>;
  teams: ReturnType<typeof listTeams>;
  matches: ReturnType<typeof listMatches>;
  entries: ReturnType<typeof listScrambleEntries>;
  participants: ReturnType<typeof listScrambleParticipants>;
  scores: HoleScoreRow[];
};

function snapshot(): Snapshot {
  return {
    rounds: listRounds(),
    holes: listAllHoles(),
    players: listPlayers(),
    teams: listTeams(),
    matches: listMatches(),
    entries: listScrambleEntries(),
    participants: listScrambleParticipants(),
    scores: listAllScores(),
  };
}

function scoreMap(scores: HoleScoreRow[], predicate: (s: HoleScoreRow) => boolean): Map<number, number> {
  const m = new Map<number, number>();
  for (const s of scores) if (predicate(s)) m.set(s.hole_number, s.strokes);
  return m;
}

export function computeDay1MatchStates(): Day1MatchStateRow[] {
  const s = snapshot();
  const day1 = s.rounds.find((r) => r.day === 1);
  if (!day1) return [];
  const day1Holes = s.holes.filter((h) => h.round_id === day1.id);
  const out: Day1MatchStateRow[] = [];
  for (const m of s.matches) {
    const p1 = s.players.find((p) => p.id === m.player1_id)!;
    const p2 = s.players.find((p) => p.id === m.player2_id)!;
    const alloc = computeStrokeAllocation(p1, p2, day1Holes);
    const p1Scores = scoreMap(s.scores, (x) => x.round_id === m.round_id && x.player_id === m.player1_id);
    const p2Scores = scoreMap(s.scores, (x) => x.round_id === m.round_id && x.player_id === m.player2_id);
    const res = computeDay1MatchResult(
      {
        p1Id: m.player1_id,
        p2Id: m.player2_id,
        strokeGiverId: m.stroke_giver_id,
        strokesGiven: m.strokes_given,
        strokeHoles: alloc.strokeHoles,
      },
      p1Scores,
      p2Scores,
    );
    out.push({
      match_id: m.id,
      round_id: m.round_id,
      match_number: m.match_number,
      player1_id: m.player1_id,
      player2_id: m.player2_id,
      stroke_giver_id: m.stroke_giver_id,
      strokes_given: m.strokes_given,
      stroke_hole_numbers: alloc.strokeHoles,
      p1_total_gross: res.p1TotalGross,
      p2_total_gross: res.p2TotalGross,
      p1_total_net: res.p1TotalNet ?? 0,
      p2_total_net: res.p2TotalNet ?? 0,
      p1_holes: res.p1HolesPlayed,
      p2_holes: res.p2HolesPlayed,
      holes_both_played: res.holesBothPlayed,
      current_holes_up: res.currentHolesUp,
      status: res.status,
      winner_player_id: res.winnerId,
      p1_team_points: res.p1TeamPoints,
      p2_team_points: res.p2TeamPoints,
    });
  }
  return out;
}

export function getDay1MatchState(matchId: string): Day1MatchStateRow | null {
  const all = computeDay1MatchStates();
  return all.find((r) => r.match_id === matchId) ?? null;
}

export function computeDay2PoolRankRows(): Day2PoolRankRow[] {
  const s = snapshot();
  const day2 = s.rounds.find((r) => r.day === 2);
  if (!day2) return [];
  const entries = s.entries.filter((e) => e.round_id === day2.id);
  const out: Day2PoolRankRow[] = [];
  for (const pool of ["AD", "BC"] as const) {
    const poolEntries = entries.filter((e) => e.pool === pool);
    const ranks = computeDay2PoolRanks(
      poolEntries.map((e) => ({
        id: e.id,
        teamId: e.team_id,
        holeScores: scoreMap(s.scores, (x) => x.scramble_entry_id === e.id),
        manualRank: e.manual_tiebreak_rank,
      })),
    );
    for (const e of poolEntries) {
      const r = ranks.get(e.id)!;
      out.push({
        entry_id: e.id,
        round_id: e.round_id,
        team_id: e.team_id,
        pool,
        manual_tiebreak_rank: e.manual_tiebreak_rank,
        team_raw: r.raw,
        holes_thru: r.holesThru,
        rank_in_pool: r.rank,
        points: r.points,
        projected: r.projected,
      });
    }
  }
  return out;
}

export function computeDay3StandingRows(): Day3StandingsRow[] {
  const s = snapshot();
  const day3 = s.rounds.find((r) => r.day === 3);
  if (!day3) return [];
  const entries = s.entries.filter((e) => e.round_id === day3.id);
  const day3Holes = s.holes.filter((h) => h.round_id === day3.id);
  const standings = computeDay3Standings(
    entries.map((e) => ({
      id: e.id,
      teamId: e.team_id,
      holeScores: scoreMap(s.scores, (x) => x.scramble_entry_id === e.id),
    })),
    day3Holes,
  );
  return entries.map((e) => {
    const r = standings.get(e.id)!;
    return {
      entry_id: e.id,
      round_id: e.round_id,
      team_id: e.team_id,
      team_raw: r.raw,
      holes_thru: r.holesThru,
      par_thru: r.parThru,
      under_par: r.underPar,
      rank: r.rank,
      placement_points: r.placementPts,
      bonus_points: r.bonusPts,
      total_points: r.totalPts,
      projected: r.projected,
    };
  });
}

export function computeLeaderboard(): LeaderboardRow[] {
  const s = snapshot();
  const teamPoints = new Map<string, { d1: number; d2: number; d3: number }>();
  s.teams.forEach((t) => teamPoints.set(t.id, { d1: 0, d2: 0, d3: 0 }));

  // Day 1
  const day1Holes = s.holes.filter((h) => s.rounds.find((r) => r.day === 1)?.id === h.round_id);
  for (const m of s.matches) {
    const p1 = s.players.find((p) => p.id === m.player1_id)!;
    const p2 = s.players.find((p) => p.id === m.player2_id)!;
    const alloc = computeStrokeAllocation(p1, p2, day1Holes);
    const res = computeDay1MatchResult(
      {
        p1Id: p1.id,
        p2Id: p2.id,
        strokeGiverId: m.stroke_giver_id,
        strokesGiven: m.strokes_given,
        strokeHoles: alloc.strokeHoles,
      },
      scoreMap(s.scores, (x) => x.round_id === m.round_id && x.player_id === p1.id),
      scoreMap(s.scores, (x) => x.round_id === m.round_id && x.player_id === p2.id),
    );
    if (res.status === "final") {
      teamPoints.get(p1.team_id)!.d1 += res.p1TeamPoints;
      teamPoints.get(p2.team_id)!.d1 += res.p2TeamPoints;
    }
  }

  // Day 2
  for (const row of computeDay2PoolRankRows()) {
    teamPoints.get(row.team_id)!.d2 += row.points;
  }

  // Day 3
  for (const row of computeDay3StandingRows()) {
    teamPoints.get(row.team_id)!.d3 += row.total_points;
  }

  // Round progress → status_label
  const progress = s.rounds.map((r) => {
    const expected =
      r.format === "singles" ? 10 * 18 * 2 : r.format === "scramble_2man" ? 10 * 18 : 5 * 18;
    const actual = s.scores.filter((x) => x.round_id === r.id).length;
    return { day: r.day, complete: actual >= expected, hasAny: actual > 0, locked: !!r.is_locked };
  });

  const completeDays = progress.filter((p) => p.complete).map((p) => p.day);
  const liveDay = progress.find((p) => p.hasAny && !p.complete)?.day;
  const maxComplete = completeDays.length ? Math.max(...completeDays) : null;
  const allComplete = completeDays.length === 3;
  const anyProjected = progress.some((p) => !p.complete && p.hasAny);

  const statusLabel = allComplete
    ? "Final"
    : liveDay
      ? `Live · Day ${liveDay}`
      : maxComplete
        ? `Thru Day ${maxComplete}`
        : "Upcoming";

  const rows = s.teams
    .map((t) => {
      const pts = teamPoints.get(t.id)!;
      return {
        team_id: t.id,
        name: t.name,
        display_color: t.display_color,
        sort_order: t.sort_order,
        day1_points: pts.d1,
        day2_points: pts.d2,
        day3_points: pts.d3,
        total_points: pts.d1 + pts.d2 + pts.d3,
      };
    })
    .sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points;
      return a.sort_order - b.sort_order;
    });

  // Competition rank (ties share rank).
  const out: LeaderboardRow[] = [];
  let lastTotal: number | null = null;
  let lastRank = 0;
  rows.forEach((r, i) => {
    if (lastTotal === null || r.total_points !== lastTotal) {
      lastRank = i + 1;
      lastTotal = r.total_points;
    }
    out.push({
      ...r,
      rank: lastRank,
      is_projected: anyProjected,
      status_label: statusLabel,
    });
  });
  return out;
}
