import { describe, it, expect } from "vitest";
import { computeDay3Standings, type Day3EntryInput } from "../day3";

// Hyland par-72 mix
const hylandHoles = [
  { hole_number: 1, par: 4 },
  { hole_number: 2, par: 4 },
  { hole_number: 3, par: 3 },
  { hole_number: 4, par: 4 },
  { hole_number: 5, par: 4 },
  { hole_number: 6, par: 3 },
  { hole_number: 7, par: 5 },
  { hole_number: 8, par: 4 },
  { hole_number: 9, par: 5 },
  { hole_number: 10, par: 3 },
  { hole_number: 11, par: 4 },
  { hole_number: 12, par: 5 },
  { hole_number: 13, par: 3 },
  { hole_number: 14, par: 4 },
  { hole_number: 15, par: 4 },
  { hole_number: 16, par: 4 },
  { hole_number: 17, par: 5 },
  { hole_number: 18, par: 4 },
];

const teamScore = (total: number): Map<number, number> => {
  const m = new Map<number, number>();
  const base = Math.floor(total / 18);
  let remainder = total - base * 18;
  for (let h = 1; h <= 18; h++) {
    m.set(h, base + (remainder > 0 ? 1 : 0));
    if (remainder > 0) remainder -= 1;
  }
  return m;
};

describe("computeDay3Standings", () => {
  it("placement 8/6/4/2/0 when complete", () => {
    const entries: Day3EntryInput[] = [
      { id: "t1", teamId: "team1", holeScores: teamScore(64) }, // 8 under
      { id: "t2", teamId: "team2", holeScores: teamScore(68) }, // 4 under
      { id: "t3", teamId: "team3", holeScores: teamScore(72) }, // even
      { id: "t4", teamId: "team4", holeScores: teamScore(74) }, // 2 over
      { id: "t5", teamId: "team5", holeScores: teamScore(80) }, // 8 over
    ];
    const r = computeDay3Standings(entries, hylandHoles);
    expect(r.get("t1")!.rank).toBe(1);
    expect(r.get("t1")!.placementPts).toBe(8);
    expect(r.get("t1")!.underPar).toBe(8);
    expect(r.get("t1")!.bonusPts).toBe(8);
    expect(r.get("t1")!.totalPts).toBe(16);

    expect(r.get("t2")!.rank).toBe(2);
    expect(r.get("t2")!.placementPts).toBe(6);
    expect(r.get("t2")!.bonusPts).toBe(4);
    expect(r.get("t2")!.totalPts).toBe(10);

    expect(r.get("t3")!.rank).toBe(3);
    expect(r.get("t3")!.placementPts).toBe(4);
    expect(r.get("t3")!.bonusPts).toBe(0);

    expect(r.get("t4")!.rank).toBe(4);
    expect(r.get("t4")!.placementPts).toBe(2);
    expect(r.get("t4")!.bonusPts).toBe(0);

    expect(r.get("t5")!.rank).toBe(5);
    expect(r.get("t5")!.placementPts).toBe(0);
    expect(r.get("t5")!.bonusPts).toBe(0);
  });

  it("over par: placement only, no bonus", () => {
    const entries: Day3EntryInput[] = [
      { id: "t1", teamId: "team1", holeScores: teamScore(74) },
      { id: "t2", teamId: "team2", holeScores: teamScore(76) },
      { id: "t3", teamId: "team3", holeScores: teamScore(78) },
      { id: "t4", teamId: "team4", holeScores: teamScore(80) },
      { id: "t5", teamId: "team5", holeScores: teamScore(82) },
    ];
    const r = computeDay3Standings(entries, hylandHoles);
    expect(r.get("t1")!.underPar).toBe(0);
    expect(r.get("t1")!.bonusPts).toBe(0);
    expect(r.get("t1")!.totalPts).toBe(8);
  });

  it("5-way tie: all share rank 1 (by id order)", () => {
    const entries: Day3EntryInput[] = [
      { id: "a", teamId: "ta", holeScores: teamScore(72) },
      { id: "b", teamId: "tb", holeScores: teamScore(72) },
      { id: "c", teamId: "tc", holeScores: teamScore(72) },
      { id: "d", teamId: "td", holeScores: teamScore(72) },
      { id: "e", teamId: "te", holeScores: teamScore(72) },
    ];
    const r = computeDay3Standings(entries, hylandHoles);
    ["a", "b", "c", "d", "e"].forEach((id) => {
      expect(r.get(id)!.rank).toBe(1);
      expect(r.get(id)!.placementPts).toBe(8); // all get 1st-place placement
    });
  });

  it("projected while incomplete — no placement, no bonus yet", () => {
    const partial = (raw: number, holes: number): Map<number, number> => {
      const m = new Map<number, number>();
      for (let h = 1; h <= holes; h++) m.set(h, Math.floor(raw / holes));
      return m;
    };
    const entries: Day3EntryInput[] = [
      { id: "t1", teamId: "team1", holeScores: partial(30, 10) },
      { id: "t2", teamId: "team2", holeScores: partial(34, 10) },
      { id: "t3", teamId: "team3", holeScores: partial(36, 10) },
      { id: "t4", teamId: "team4", holeScores: partial(40, 10) },
      { id: "t5", teamId: "team5", holeScores: partial(44, 10) },
    ];
    const r = computeDay3Standings(entries, hylandHoles);
    entries.forEach((e) => {
      expect(r.get(e.id)!.projected).toBe(true);
      expect(r.get(e.id)!.placementPts).toBe(0);
      expect(r.get(e.id)!.bonusPts).toBe(0);
    });
    expect(r.get("t1")!.rank).toBe(1);
  });
});
