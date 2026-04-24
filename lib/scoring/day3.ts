// Day 3 — 4-man scramble, 5 team entries.
// Placement pts: 1=8, 2=6, 3=4, 4=2, 5=0.
// Bonus pts: +1 per stroke under course par (par of holes played).

export type Day3EntryInput = {
  id: string;
  teamId: string;
  holeScores: Map<number, number>;
};

export type Day3EntryResult = {
  entryId: string;
  teamId: string;
  rank: number;
  placementPts: number;
  underPar: number;
  bonusPts: number;
  totalPts: number;
  raw: number;
  parThru: number;
  holesThru: number;
  projected: boolean;
};

const PLACEMENT_BY_RANK: Record<number, number> = {
  1: 8,
  2: 6,
  3: 4,
  4: 2,
  5: 0,
};

export function computeDay3Standings(
  entries: Day3EntryInput[],
  holes: { hole_number: number; par: number }[],
): Map<string, Day3EntryResult> {
  const parByHole = new Map(holes.map((h) => [h.hole_number, h.par]));

  const augmented = entries.map((e) => {
    const holeNumbers = [...e.holeScores.keys()];
    const raw = [...e.holeScores.values()].reduce((a, b) => a + b, 0);
    const parThru = holeNumbers.reduce((sum, h) => sum + (parByHole.get(h) ?? 0), 0);
    return {
      ...e,
      raw,
      parThru,
      holesThru: holeNumbers.length,
    };
  });

  const allComplete = augmented.every((e) => e.holesThru === 18);

  // Rank by raw ascending; ties share the same rank (competition rank).
  const sorted = [...augmented].sort((a, b) => {
    if (a.raw !== b.raw) return a.raw - b.raw;
    return a.id.localeCompare(b.id);
  });

  const rankById = new Map<string, number>();
  let lastRaw: number | null = null;
  let lastRank = 0;
  sorted.forEach((e, idx) => {
    if (lastRaw === null || e.raw !== lastRaw) {
      lastRank = idx + 1;
      lastRaw = e.raw;
    }
    rankById.set(e.id, lastRank);
  });

  const results = new Map<string, Day3EntryResult>();
  augmented.forEach((e) => {
    const rank = rankById.get(e.id)!;
    const underPar = Math.max(0, e.parThru - e.raw);
    const placementPts = allComplete ? (PLACEMENT_BY_RANK[rank] ?? 0) : 0;
    const bonusPts = allComplete ? underPar : 0;
    results.set(e.id, {
      entryId: e.id,
      teamId: e.teamId,
      rank,
      placementPts,
      underPar,
      bonusPts,
      totalPts: placementPts + bonusPts,
      raw: e.raw,
      parThru: e.parThru,
      holesThru: e.holesThru,
      projected: !allComplete,
    });
  });

  return results;
}
