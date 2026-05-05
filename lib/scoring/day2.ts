// Day 2 — two pools of 5, 2-man scramble. Each tee time also features a head-
// to-head match between the AD and BC pair grouped together. Total 20 points
// per round: 15 awarded by pool placement (2.5/2/1.5/1/0.5 per pool) and 5 by
// the head-to-head matches (1 win / 0.5 tie · five tee times).

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
  1: 2.5,
  2: 2,
  3: 1.5,
  4: 1,
  5: 0.5,
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

// ---- Head-to-head matches (one per tee time) ----

export type Day2H2HInput = {
  groupId: string;
  groupNumber: number;
  entryA: { id: string; teamId: string; holeScores: Map<number, number> };
  entryB: { id: string; teamId: string; holeScores: Map<number, number> };
};

export type Day2H2HResult = {
  groupId: string;
  groupNumber: number;
  entryA: { id: string; teamId: string; raw: number; thru: number };
  entryB: { id: string; teamId: string; raw: number; thru: number };
  status: "pending" | "in_progress" | "final";
  /** Winning team id when the match goes final and is not a tie. */
  winnerTeamId: string | null;
  isTie: boolean;
  /** Awarded only once status === "final". */
  teamAPoints: number;
  teamBPoints: number;
};

export function computeDay2H2H(input: Day2H2HInput): Day2H2HResult {
  const aThru = [...input.entryA.holeScores.keys()].length;
  const bThru = [...input.entryB.holeScores.keys()].length;
  const aRaw = [...input.entryA.holeScores.values()].reduce((s, x) => s + x, 0);
  const bRaw = [...input.entryB.holeScores.values()].reduce((s, x) => s + x, 0);

  const status: "pending" | "in_progress" | "final" =
    aThru === 18 && bThru === 18
      ? "final"
      : aThru === 0 && bThru === 0
        ? "pending"
        : "in_progress";

  let winnerTeamId: string | null = null;
  let isTie = false;
  let teamAPoints = 0;
  let teamBPoints = 0;

  if (status === "final") {
    if (aRaw < bRaw) {
      winnerTeamId = input.entryA.teamId;
      teamAPoints = 1;
    } else if (bRaw < aRaw) {
      winnerTeamId = input.entryB.teamId;
      teamBPoints = 1;
    } else {
      isTie = true;
      teamAPoints = 0.5;
      teamBPoints = 0.5;
    }
  }

  return {
    groupId: input.groupId,
    groupNumber: input.groupNumber,
    entryA: {
      id: input.entryA.id,
      teamId: input.entryA.teamId,
      raw: aRaw,
      thru: aThru,
    },
    entryB: {
      id: input.entryB.id,
      teamId: input.entryB.teamId,
      raw: bRaw,
      thru: bThru,
    },
    status,
    winnerTeamId,
    isTie,
    teamAPoints,
    teamBPoints,
  };
}
