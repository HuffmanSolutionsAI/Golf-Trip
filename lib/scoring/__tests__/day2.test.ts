import { describe, it, expect } from "vitest";
import { computeDay2PoolRanks, type Day2EntryInput } from "../day2";

const scoresFull = (raw: number): Map<number, number> => {
  // Distribute `raw` strokes across 18 holes as evenly as possible.
  const m = new Map<number, number>();
  const base = Math.floor(raw / 18);
  let remainder = raw - base * 18;
  for (let h = 1; h <= 18; h++) {
    const s = base + (remainder > 0 ? 1 : 0);
    m.set(h, s);
    if (remainder > 0) remainder -= 1;
  }
  return m;
};

const partial = (raw: number, holes: number): Map<number, number> => {
  const m = new Map<number, number>();
  const base = Math.floor(raw / holes);
  let remainder = raw - base * holes;
  for (let h = 1; h <= holes; h++) {
    m.set(h, base + (remainder > 0 ? 1 : 0));
    if (remainder > 0) remainder -= 1;
  }
  return m;
};

describe("computeDay2PoolRanks — complete pool", () => {
  it("awards 5/3/1/0/0 by rank", () => {
    const entries: Day2EntryInput[] = [
      { id: "t1", teamId: "team1", holeScores: scoresFull(65), manualRank: null },
      { id: "t2", teamId: "team2", holeScores: scoresFull(70), manualRank: null },
      { id: "t3", teamId: "team3", holeScores: scoresFull(72), manualRank: null },
      { id: "t4", teamId: "team4", holeScores: scoresFull(78), manualRank: null },
      { id: "t5", teamId: "team5", holeScores: scoresFull(80), manualRank: null },
    ];
    const r = computeDay2PoolRanks(entries);
    expect(r.get("t1")!.rank).toBe(1);
    expect(r.get("t1")!.points).toBe(5);
    expect(r.get("t2")!.points).toBe(3);
    expect(r.get("t3")!.points).toBe(1);
    expect(r.get("t4")!.points).toBe(0);
    expect(r.get("t5")!.points).toBe(0);
    entries.forEach((e) => {
      expect(r.get(e.id)!.projected).toBe(false);
    });
  });

  it("ties share the same rank (competition rank)", () => {
    const entries: Day2EntryInput[] = [
      { id: "a", teamId: "ta", holeScores: scoresFull(70), manualRank: null },
      { id: "b", teamId: "tb", holeScores: scoresFull(70), manualRank: null },
      { id: "c", teamId: "tc", holeScores: scoresFull(72), manualRank: null },
      { id: "d", teamId: "td", holeScores: scoresFull(75), manualRank: null },
      { id: "e", teamId: "te", holeScores: scoresFull(78), manualRank: null },
    ];
    const r = computeDay2PoolRanks(entries);
    expect(r.get("a")!.rank).toBe(1);
    expect(r.get("b")!.rank).toBe(1);
    expect(r.get("c")!.rank).toBe(3);
    expect(r.get("d")!.rank).toBe(4);
    expect(r.get("e")!.rank).toBe(5);
  });

  it("manual tiebreak overrides natural rank", () => {
    const entries: Day2EntryInput[] = [
      { id: "a", teamId: "ta", holeScores: scoresFull(70), manualRank: 2 },
      { id: "b", teamId: "tb", holeScores: scoresFull(70), manualRank: 1 },
      { id: "c", teamId: "tc", holeScores: scoresFull(72), manualRank: null },
      { id: "d", teamId: "td", holeScores: scoresFull(75), manualRank: null },
      { id: "e", teamId: "te", holeScores: scoresFull(78), manualRank: null },
    ];
    const r = computeDay2PoolRanks(entries);
    expect(r.get("b")!.rank).toBe(1);
    expect(r.get("b")!.points).toBe(5);
    expect(r.get("a")!.rank).toBe(2);
    expect(r.get("a")!.points).toBe(3);
  });
});

describe("computeDay2PoolRanks — projected", () => {
  it("projected while incomplete; points = 0", () => {
    const entries: Day2EntryInput[] = [
      { id: "a", teamId: "ta", holeScores: partial(40, 10), manualRank: null },
      { id: "b", teamId: "tb", holeScores: partial(42, 10), manualRank: null },
      { id: "c", teamId: "tc", holeScores: partial(45, 10), manualRank: null },
      { id: "d", teamId: "td", holeScores: partial(48, 10), manualRank: null },
      { id: "e", teamId: "te", holeScores: partial(52, 10), manualRank: null },
    ];
    const r = computeDay2PoolRanks(entries);
    entries.forEach((e) => {
      expect(r.get(e.id)!.projected).toBe(true);
      expect(r.get(e.id)!.points).toBe(0);
    });
    // Rank order should still be computable.
    expect(r.get("a")!.rank).toBe(1);
    expect(r.get("e")!.rank).toBe(5);
  });
});
