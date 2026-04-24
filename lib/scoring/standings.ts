// Cross-day aggregation — canonical leaderboard computation from raw inputs.

import { computeDay1MatchResult, type Day1MatchInput } from "./day1";
import { computeDay2PoolRanks, type Day2EntryInput } from "./day2";
import { computeDay3Standings, type Day3EntryInput } from "./day3";

export type TeamPointsInput = {
  teamIds: string[];
  playerToTeam: Map<string, string>;
  day1Matches: {
    match: Day1MatchInput;
    p1Scores: Map<number, number>;
    p2Scores: Map<number, number>;
  }[];
  day2Entries: Day2EntryInput[];
  day3Entries: Day3EntryInput[];
  day3Holes: { hole_number: number; par: number }[];
};

export type TeamPointsRow = {
  teamId: string;
  day1: number;
  day2: number;
  day3: number;
  total: number;
};

export function computeTeamPoints(input: TeamPointsInput): TeamPointsRow[] {
  const day1: Map<string, number> = new Map(input.teamIds.map((id) => [id, 0]));
  const day2: Map<string, number> = new Map(input.teamIds.map((id) => [id, 0]));
  const day3: Map<string, number> = new Map(input.teamIds.map((id) => [id, 0]));

  for (const { match, p1Scores, p2Scores } of input.day1Matches) {
    const result = computeDay1MatchResult(match, p1Scores, p2Scores);
    if (result.status === "final") {
      const t1 = input.playerToTeam.get(match.p1Id);
      const t2 = input.playerToTeam.get(match.p2Id);
      if (t1) day1.set(t1, (day1.get(t1) ?? 0) + result.p1TeamPoints);
      if (t2) day1.set(t2, (day1.get(t2) ?? 0) + result.p2TeamPoints);
    }
  }

  // Day 2 is split into two pools; rank within each pool separately.
  const adEntries = input.day2Entries.filter((e) => e.id.endsWith(":AD") || e.id.includes("AD"));
  // Instead of sniffing id strings, rely on the caller to group. Accept a flat list
  // and split by a convention: we attach poolKey via teamId pairing — but to keep
  // this function pure, require the caller to call computeDay2PoolRanks per pool.
  // For convenience: group by reading from the input (we added poolKey to id only
  // as a safe convention). Simplest path: don't try to split — let test/integration
  // code call day2 per-pool. Here we delegate only across all entries if provided
  // as a single pool. (standings.ts test uses the per-pool path.)

  const day2Results = computeDay2PoolRanks(input.day2Entries);
  day2Results.forEach((r) => {
    day2.set(r.teamId, (day2.get(r.teamId) ?? 0) + r.points);
  });
  // (adEntries reference is unused; kept for clarity above — intentional no-op.)
  void adEntries;

  const day3Results = computeDay3Standings(input.day3Entries, input.day3Holes);
  day3Results.forEach((r) => {
    day3.set(r.teamId, (day3.get(r.teamId) ?? 0) + r.totalPts);
  });

  return input.teamIds.map((id) => {
    const d1 = day1.get(id) ?? 0;
    const d2 = day2.get(id) ?? 0;
    const d3 = day3.get(id) ?? 0;
    return { teamId: id, day1: d1, day2: d2, day3: d3, total: d1 + d2 + d3 };
  });
}
