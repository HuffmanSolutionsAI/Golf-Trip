import { describe, it, expect } from "vitest";
import { computeTeamPoints } from "../standings";

const emptyScores = (): Map<number, number> => new Map();

describe("computeTeamPoints integration — nothing played", () => {
  it("returns zeros for every team", () => {
    const r = computeTeamPoints({
      teamIds: ["t1", "t2", "t3", "t4", "t5"],
      playerToTeam: new Map(),
      day1Matches: [],
      day2Entries: [],
      day3Entries: [],
      day3Holes: [],
    });
    expect(r).toHaveLength(5);
    r.forEach((row) => {
      expect(row.total).toBe(0);
    });
  });
});

describe("computeTeamPoints integration — single Day 1 final", () => {
  it("awards 2 pts to the winner's team", () => {
    const playerToTeam = new Map<string, string>([
      ["p1", "tA"],
      ["p2", "tB"],
    ]);
    const p1Scores = new Map<number, number>();
    const p2Scores = new Map<number, number>();
    for (let h = 1; h <= 18; h++) {
      p1Scores.set(h, 4);
      p2Scores.set(h, 5);
    }
    const r = computeTeamPoints({
      teamIds: ["tA", "tB"],
      playerToTeam,
      day1Matches: [
        {
          match: {
            p1Id: "p1",
            p2Id: "p2",
            strokeGiverId: null,
            strokesGiven: 0,
          },
          p1Scores,
          p2Scores,
        },
      ],
      day2Entries: [],
      day3Entries: [],
      day3Holes: [],
    });
    const map = new Map(r.map((row) => [row.teamId, row]));
    expect(map.get("tA")!.day1).toBe(2);
    expect(map.get("tA")!.total).toBe(2);
    expect(map.get("tB")!.day1).toBe(0);
  });
});
