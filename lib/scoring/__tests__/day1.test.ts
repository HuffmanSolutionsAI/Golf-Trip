import { describe, it, expect } from "vitest";
import { computeDay1MatchResult, type Day1MatchInput } from "../day1";

const baseMatch: Day1MatchInput = {
  p1Id: "p1",
  p2Id: "p2",
  strokeGiverId: null,
  strokesGiven: 0,
  strokeHoles: [],
};

const scores = (arr: number[]): Map<number, number> => {
  const m = new Map<number, number>();
  arr.forEach((s, i) => m.set(i + 1, s));
  return m;
};

describe("computeDay1MatchResult — pending / in_progress states", () => {
  it("pending before any hole entered", () => {
    const r = computeDay1MatchResult(baseMatch, new Map(), new Map());
    expect(r.status).toBe("pending");
    expect(r.winnerId).toBeNull();
    expect(r.p1TeamPoints).toBe(0);
    expect(r.p2TeamPoints).toBe(0);
  });

  it("in_progress after partial entry", () => {
    const r = computeDay1MatchResult(
      baseMatch,
      scores([4, 4, 4]),
      scores([5, 4, 5]),
    );
    expect(r.status).toBe("in_progress");
    expect(r.p1HolesPlayed).toBe(3);
    expect(r.holesBothPlayed).toBe(3);
    // p1 net = 12, p2 net = 14 → p1 up 2
    expect(r.currentHolesUp).toBe(2);
    expect(r.p1TeamPoints).toBe(0); // not awarded until final
  });
});

describe("computeDay1MatchResult — clean 18-hole finals without strokes", () => {
  it("p1 wins straight up (lower gross)", () => {
    const p1 = scores(Array(18).fill(4));       // 72
    const p2 = scores(Array(18).fill(5));       // 90
    const r = computeDay1MatchResult(baseMatch, p1, p2);
    expect(r.status).toBe("final");
    expect(r.p1TotalGross).toBe(72);
    expect(r.p2TotalGross).toBe(90);
    expect(r.p1TotalNet).toBe(72);
    expect(r.p2TotalNet).toBe(90);
    expect(r.winnerId).toBe("p1");
    expect(r.p1TeamPoints).toBe(2);
    expect(r.p2TeamPoints).toBe(0);
  });

  it("tie → 1 pt each", () => {
    const p1 = scores(Array(18).fill(4));
    const p2 = scores(Array(18).fill(4));
    const r = computeDay1MatchResult(baseMatch, p1, p2);
    expect(r.status).toBe("final");
    expect(r.winnerId).toBeNull();
    expect(r.p1TeamPoints).toBe(1);
    expect(r.p2TeamPoints).toBe(1);
  });
});

describe("computeDay1MatchResult — strokes applied", () => {
  const match: Day1MatchInput = {
    p1Id: "reid",
    p2Id: "pincus",
    strokeGiverId: "pincus",
    strokesGiven: 4,
    strokeHoles: [1, 2, 3, 4],
  };

  it("p2 wins by net after 4 strokes", () => {
    // Gross: p1 72, p2 74. Net p2 = 70 → p2 wins by 2.
    const p1 = scores(Array(18).fill(4));          // 72
    const p2 = scores(Array(18).fill(4).map((v, i) => (i < 4 ? v + 0 : v))); // all 4s -> 72
    // adjust p2 to gross 74
    p2.set(1, 5);
    p2.set(18, 5);
    const r = computeDay1MatchResult(match, p1, p2);
    expect(r.p1TotalGross).toBe(72);
    expect(r.p2TotalGross).toBe(74);
    expect(r.p1TotalNet).toBe(72);
    expect(r.p2TotalNet).toBe(70); // 74 - 4 strokes
    expect(r.winnerId).toBe("pincus");
    expect(r.p2TeamPoints).toBe(2);
    expect(r.p1TeamPoints).toBe(0);
  });

  it("strokes on hardest holes only — strokes applied to running net", () => {
    // Build a match where p2 is up 2 after all 18 without strokes
    // but strokes push p1 to a tie.
    const match2: Day1MatchInput = {
      p1Id: "a",
      p2Id: "b",
      strokeGiverId: "a",
      strokesGiven: 2,
      strokeHoles: [5, 10],
    };
    const p1 = scores(Array(18).fill(4));  // 72 gross → 70 net
    const p2 = scores(Array(18).fill(4).map((v, i) => (i === 0 || i === 1 ? 3 : v)));
    // p2: two 3s + sixteen 4s = 70
    const r = computeDay1MatchResult(match2, p1, p2);
    expect(r.p1TotalGross).toBe(72);
    expect(r.p2TotalGross).toBe(70);
    expect(r.p1TotalNet).toBe(70);
    expect(r.p2TotalNet).toBe(70);
    expect(r.winnerId).toBeNull();
    expect(r.p1TeamPoints).toBe(1);
    expect(r.p2TeamPoints).toBe(1);
  });
});

describe("computeDay1MatchResult — pending stroke allocation (Holly)", () => {
  it("no stroke holes but strokesGiven known: net calc uses 0 strokes deducted", () => {
    const match: Day1MatchInput = {
      p1Id: "a",
      p2Id: "b",
      strokeGiverId: "b",
      strokesGiven: 4,
      strokeHoles: [], // pending index data
    };
    const p1 = scores(Array(18).fill(4));
    const p2 = scores(Array(18).fill(4));
    const r = computeDay1MatchResult(match, p1, p2);
    expect(r.p1TotalNet).toBe(72);
    expect(r.p2TotalNet).toBe(72); // no strokes applied until strokeHoles is populated
    expect(r.winnerId).toBeNull();
  });
});
