// Day 1 — net stroke play, head-to-head pairings.
// Win = 2 pts, Tie = 1 pt, Loss = 0. Net = total gross − strokesGiven (applied
// once to the giver's total, not per-hole). Match is decided after all 18 holes.

export type Day1MatchInput = {
  p1Id: string;
  p2Id: string;
  strokeGiverId: string | null;
  strokesGiven: number;
};

export type Day1MatchResult = {
  p1TotalGross: number;
  p2TotalGross: number;
  p1TotalNet: number | null;
  p2TotalNet: number | null;
  winnerId: string | null;
  p1TeamPoints: 0 | 1 | 2;
  p2TeamPoints: 0 | 1 | 2;
  status: "pending" | "in_progress" | "final";
  p1HolesPlayed: number;
  p2HolesPlayed: number;
  holesBothPlayed: number;
  netDiff: number; // signed: + = p1 ahead (lower net), - = p2 ahead
};

export function computeDay1MatchResult(
  match: Day1MatchInput,
  p1Scores: Map<number, number>,
  p2Scores: Map<number, number>,
): Day1MatchResult {
  let p1Gross = 0;
  let p2Gross = 0;
  let p1Holes = 0;
  let p2Holes = 0;
  let holesBothPlayed = 0;

  for (let h = 1; h <= 18; h++) {
    const s1 = p1Scores.get(h);
    const s2 = p2Scores.get(h);
    if (s1 != null) {
      p1Gross += s1;
      p1Holes += 1;
    }
    if (s2 != null) {
      p2Gross += s2;
      p2Holes += 1;
    }
    if (s1 != null && s2 != null) holesBothPlayed += 1;
  }

  const allPlayed = p1Holes === 18 && p2Holes === 18;
  const status: Day1MatchResult["status"] = allPlayed
    ? "final"
    : p1Holes === 0 && p2Holes === 0
      ? "pending"
      : "in_progress";

  const p1TotalNet = match.strokeGiverId === match.p1Id ? p1Gross - match.strokesGiven : p1Gross;
  const p2TotalNet = match.strokeGiverId === match.p2Id ? p2Gross - match.strokesGiven : p2Gross;

  // Live net difference uses whatever's been entered. Lower net = winning, so
  // p1 ahead → positive. While the match is in progress this is just an
  // indicator, not a final result.
  const netDiff = p2TotalNet - p1TotalNet;

  let winnerId: string | null = null;
  let p1TeamPoints: 0 | 1 | 2 = 0;
  let p2TeamPoints: 0 | 1 | 2 = 0;
  if (allPlayed) {
    if (p1TotalNet < p2TotalNet) {
      winnerId = match.p1Id;
      p1TeamPoints = 2;
    } else if (p2TotalNet < p1TotalNet) {
      winnerId = match.p2Id;
      p2TeamPoints = 2;
    } else {
      p1TeamPoints = 1;
      p2TeamPoints = 1;
    }
  }

  return {
    p1TotalGross: p1Gross,
    p2TotalGross: p2Gross,
    p1TotalNet: p1Holes > 0 ? p1TotalNet : null,
    p2TotalNet: p2Holes > 0 ? p2TotalNet : null,
    winnerId,
    p1TeamPoints,
    p2TeamPoints,
    status,
    p1HolesPlayed: p1Holes,
    p2HolesPlayed: p2Holes,
    holesBothPlayed,
    netDiff,
  };
}
