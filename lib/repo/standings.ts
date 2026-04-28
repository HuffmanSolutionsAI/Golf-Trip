import "server-only";
import {
  listMatches,
  listScrambleEntries,
  listAllScores,
  listScrambleParticipants,
} from "./scores";
import { listPlayers, listTeams } from "./players";
import { listRounds, listAllHoles } from "./rounds";
import { computeDay1MatchResult } from "@/lib/scoring/day1";
import { computeDay2PoolRanks } from "@/lib/scoring/day2";
import { computeDay3Standings } from "@/lib/scoring/day3";
import type {
  Day1IndividualRow,
  Day1MatchStateRow,
  Day2EntryDisplayRow,
  Day2PoolRankRow,
  Day3EntryDisplayRow,
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
  const out: Day1MatchStateRow[] = [];
  for (const m of s.matches) {
    const p1Scores = scoreMap(s.scores, (x) => x.round_id === m.round_id && x.player_id === m.player1_id);
    const p2Scores = scoreMap(s.scores, (x) => x.round_id === m.round_id && x.player_id === m.player2_id);
    const res = computeDay1MatchResult(
      {
        p1Id: m.player1_id,
        p2Id: m.player2_id,
        strokeGiverId: m.stroke_giver_id,
        strokesGiven: m.strokes_given,
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
      p1_total_gross: res.p1TotalGross,
      p2_total_gross: res.p2TotalGross,
      p1_total_net: res.p1TotalNet ?? 0,
      p2_total_net: res.p2TotalNet ?? 0,
      p1_holes: res.p1HolesPlayed,
      p2_holes: res.p2HolesPlayed,
      holes_both_played: res.holesBothPlayed,
      net_diff: res.netDiff,
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

// ---- Tournament-style daily leaderboards ----

function rankByScoreToPar<T extends { score_to_par: number; holes_thru: number; player_name?: string; team_name?: string }>(
  rows: T[],
): (T & { rank: number })[] {
  // Sort: players who have started come first ranked by score_to_par; non-starters go last.
  const sorted = [...rows].sort((a, b) => {
    const aStarted = a.holes_thru > 0;
    const bStarted = b.holes_thru > 0;
    if (aStarted && !bStarted) return -1;
    if (!aStarted && bStarted) return 1;
    if (aStarted && bStarted) return a.score_to_par - b.score_to_par;
    const labelA = (a.player_name ?? a.team_name ?? "") as string;
    const labelB = (b.player_name ?? b.team_name ?? "") as string;
    return labelA.localeCompare(labelB);
  });
  // Competition rank — ties share rank, only over started rows.
  let lastKey: number | null = null;
  let lastRank = 0;
  return sorted.map((r, i) => {
    if (r.holes_thru === 0) {
      return { ...r, rank: 0 }; // 0 = not started
    }
    if (lastKey === null || r.score_to_par !== lastKey) {
      lastRank = i + 1;
      lastKey = r.score_to_par;
    }
    return { ...r, rank: lastRank };
  });
}

export function computeDay1IndividualLeaderboard(): Day1IndividualRow[] {
  const s = snapshot();
  const day1 = s.rounds.find((r) => r.day === 1);
  if (!day1) return [];
  const day1Holes = s.holes.filter((h) => h.round_id === day1.id);
  const parByHole = new Map(day1Holes.map((h) => [h.hole_number, h.par]));
  const teams = new Map(s.teams.map((t) => [t.id, t]));
  const players = new Map(s.players.map((p) => [p.id, p]));

  const rows: Omit<Day1IndividualRow, "rank">[] = [];
  for (const m of s.matches) {
    const p1 = players.get(m.player1_id);
    const p2 = players.get(m.player2_id);
    if (!p1 || !p2) continue;
    const p1Scores = scoreMap(s.scores, (x) => x.round_id === m.round_id && x.player_id === p1.id);
    const p2Scores = scoreMap(s.scores, (x) => x.round_id === m.round_id && x.player_id === p2.id);
    const res = computeDay1MatchResult(
      {
        p1Id: p1.id,
        p2Id: p2.id,
        strokeGiverId: m.stroke_giver_id,
        strokesGiven: m.strokes_given,
      },
      p1Scores,
      p2Scores,
    );
    const p1ParThru = [...p1Scores.keys()].reduce((sum, h) => sum + (parByHole.get(h) ?? 0), 0);
    const p2ParThru = [...p2Scores.keys()].reduce((sum, h) => sum + (parByHole.get(h) ?? 0), 0);
    const t1 = teams.get(p1.team_id)!;
    const t2 = teams.get(p2.team_id)!;

    rows.push({
      player_id: p1.id,
      player_name: p1.name,
      team_id: p1.team_id,
      team_name: t1.name,
      display_color: t1.display_color,
      team_slot: p1.team_slot,
      handicap: p1.handicap,
      match_id: m.id,
      match_number: m.match_number,
      opponent_id: p2.id,
      opponent_name: p2.name,
      gross_total: res.p1TotalGross,
      par_thru: p1ParThru,
      score_to_par: res.p1TotalGross - p1ParThru,
      holes_thru: res.p1HolesPlayed,
      match_status: res.status,
      net_diff: res.netDiff,
      is_winner: res.status === "final" ? res.winnerId === p1.id : null,
    });
    rows.push({
      player_id: p2.id,
      player_name: p2.name,
      team_id: p2.team_id,
      team_name: t2.name,
      display_color: t2.display_color,
      team_slot: p2.team_slot,
      handicap: p2.handicap,
      match_id: m.id,
      match_number: m.match_number,
      opponent_id: p1.id,
      opponent_name: p1.name,
      gross_total: res.p2TotalGross,
      par_thru: p2ParThru,
      score_to_par: res.p2TotalGross - p2ParThru,
      holes_thru: res.p2HolesPlayed,
      match_status: res.status,
      net_diff: -res.netDiff,
      is_winner: res.status === "final" ? res.winnerId === p2.id : null,
    });
  }
  return rankByScoreToPar(rows);
}

export function computeDay2EntryLeaderboard(): Day2EntryDisplayRow[] {
  const s = snapshot();
  const day2 = s.rounds.find((r) => r.day === 2);
  if (!day2) return [];
  const day2Holes = s.holes.filter((h) => h.round_id === day2.id);
  const parByHole = new Map(day2Holes.map((h) => [h.hole_number, h.par]));
  const teams = new Map(s.teams.map((t) => [t.id, t]));
  const players = new Map(s.players.map((p) => [p.id, p]));

  const poolRows = computeDay2PoolRankRows();
  const poolRowMap = new Map(poolRows.map((r) => [r.entry_id, r]));

  const entries = s.entries.filter((e) => e.round_id === day2.id);
  const rows: Omit<Day2EntryDisplayRow, "rank_overall">[] = entries.map((e) => {
    const team = teams.get(e.team_id)!;
    const ranked = poolRowMap.get(e.id)!;
    const scores = s.scores.filter((x) => x.scramble_entry_id === e.id);
    const parThru = scores.reduce((sum, x) => sum + (parByHole.get(x.hole_number) ?? 0), 0);
    const partIds = s.participants.filter((p) => p.scramble_entry_id === e.id).map((p) => p.player_id);
    const partNames = partIds
      .map((id) => players.get(id)?.name)
      .filter((n): n is string => !!n)
      .sort();
    return {
      entry_id: e.id,
      team_id: e.team_id,
      team_name: team.name,
      display_color: team.display_color,
      pool: ranked.pool,
      participant_names: partNames,
      team_raw: ranked.team_raw,
      par_thru: parThru,
      score_to_par: ranked.team_raw - parThru,
      holes_thru: ranked.holes_thru,
      rank_in_pool: ranked.rank_in_pool,
      points: ranked.points,
      projected: ranked.projected,
    };
  });
  const ranked = rankByScoreToPar(rows);
  return ranked.map(({ rank, ...rest }) => ({ ...rest, rank_overall: rank }));
}

export function computeDay3EntryLeaderboard(): Day3EntryDisplayRow[] {
  const s = snapshot();
  const day3 = s.rounds.find((r) => r.day === 3);
  if (!day3) return [];
  const teams = new Map(s.teams.map((t) => [t.id, t]));
  const players = new Map(s.players.map((p) => [p.id, p]));
  const standings = computeDay3StandingRows();
  return standings
    .map((r): Day3EntryDisplayRow => {
      const team = teams.get(r.team_id)!;
      const partIds = s.participants
        .filter((p) => p.scramble_entry_id === r.entry_id)
        .map((p) => p.player_id);
      const partNames = partIds
        .map((id) => players.get(id)?.name)
        .filter((n): n is string => !!n)
        .sort();
      return {
        entry_id: r.entry_id,
        team_id: r.team_id,
        team_name: team.name,
        display_color: team.display_color,
        participant_names: partNames,
        team_raw: r.team_raw,
        par_thru: r.par_thru,
        score_to_par: r.team_raw - r.par_thru,
        holes_thru: r.holes_thru,
        rank: r.rank,
        placement_points: r.placement_points,
        bonus_points: r.bonus_points,
        total_points: r.total_points,
        projected: r.projected,
      };
    })
    .sort((a, b) => {
      const aStarted = a.holes_thru > 0;
      const bStarted = b.holes_thru > 0;
      if (aStarted && !bStarted) return -1;
      if (!aStarted && bStarted) return 1;
      if (aStarted && bStarted) return a.score_to_par - b.score_to_par;
      return a.team_name.localeCompare(b.team_name);
    });
}

export function computeLeaderboard(): LeaderboardRow[] {
  const s = snapshot();
  const teamPoints = new Map<string, { d1: number; d2: number; d3: number }>();
  s.teams.forEach((t) => teamPoints.set(t.id, { d1: 0, d2: 0, d3: 0 }));

  // Day 1
  for (const m of s.matches) {
    const p1 = s.players.find((p) => p.id === m.player1_id)!;
    const p2 = s.players.find((p) => p.id === m.player2_id)!;
    const res = computeDay1MatchResult(
      {
        p1Id: p1.id,
        p2Id: p2.id,
        strokeGiverId: m.stroke_giver_id,
        strokesGiven: m.strokes_given,
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
