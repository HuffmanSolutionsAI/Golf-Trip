// Day 2 — two pools of 5, 2-man scramble. Rank per pool.
// Points by rank: 1=4, 2=3, 3=2, 4=1, 5=0. (10 per pool, 20 total.)

export type Day2EntryInput = {
  id: string;
  teamId: string;
  holeScores: Map<number, number>;
  manualRank: number | null;
};

export type Day2EntryResult = {
  entryId: string;
  teamId: string;
  rank: number;
  points: number;
  raw: number;
  holesThru: number;
  projected: boolean;
};

const POOL_POINTS_BY_RANK: Record<number, number> = {
  1: 4,
  2: 3,
  3: 2,
  4: 1,
  5: 0,
};

export function computeDay2PoolRanks(
  entries: Day2EntryInput[],
): Map<string, Day2EntryResult> {
  const augmented = entries.map((e) => {
    const holes = [...e.holeScores.keys()].length;
    const raw = [...e.holeScores.values()].reduce((a, b) => a + b, 0);
    return { ...e, raw, holesThru: holes };
  });

  const allComplete = augmented.every((e) => e.holesThru === 18);

  // Natural rank = ascending by raw, with ties broken by entry id for determinism.
  const sorted = [...augmented].sort((a, b) => {
    if (a.raw !== b.raw) return a.raw - b.raw;
    return a.id.localeCompare(b.id);
  });

  const naturalRank = new Map<string, number>();
  let lastRaw: number | null = null;
  let lastRank = 0;
  sorted.forEach((e, idx) => {
    // Use competition rank (1-2-2-4) — matches SQL dense_rank for ties=same rank.
    if (lastRaw === null || e.raw !== lastRaw) {
      lastRank = idx + 1;
      lastRaw = e.raw;
    }
    naturalRank.set(e.id, lastRank);
  });

  const results = new Map<string, Day2EntryResult>();
  augmented.forEach((e) => {
    const natural = naturalRank.get(e.id)!;
    const rank = e.manualRank ?? natural;
    const points = allComplete ? (POOL_POINTS_BY_RANK[rank] ?? 0) : 0;
    results.set(e.id, {
      entryId: e.id,
      teamId: e.teamId,
      rank,
      points,
      raw: e.raw,
      holesThru: e.holesThru,
      projected: !allComplete,
    });
  });

  return results;
}
