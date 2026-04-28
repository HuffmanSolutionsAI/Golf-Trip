import { describe, it, expect } from "vitest";
import { computeDay1MatchResult, type Day1MatchInput } from "../day1";

const baseMatch: Day1MatchInput = {
  p1Id: "p1",
  p2Id: "p2",
  strokeGiverId: null,
  strokesGiven: 0,
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
    expect(r.netDiff).toBe(0);
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
    // p1 gross 12, p2 gross 14, no strokes → p1 ahead by 2
    expect(r.netDiff).toBe(2);
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

describe("computeDay1MatchResult — strokes deducted from total", () => {
  it("ham gets 3 strokes, beats reid on net even though reid is lower gross", () => {
    // Reid (p1) shoots 80 gross, Ham (p2) shoots 82 gross, Ham gets 3 strokes
    // Net: Reid 80, Ham 79 → Ham wins by 1.
    const match: Day1MatchInput = {
      p1Id: "reid",
      p2Id: "ham",
      strokeGiverId: "ham",
      strokesGiven: 3,
    };
    const p1 = scores([5, 4, 4, 4, 5, 4, 5, 4, 5, 5, 4, 4, 4, 5, 4, 5, 4, 4]); // 79? let's compute
    // Hand-build to 80:
    const reid = new Map<number, number>();
    for (let h = 1; h <= 18; h++) reid.set(h, 4);
    reid.set(1, 5); reid.set(7, 5); reid.set(13, 5); reid.set(18, 5);
    // 14 fours + 4 fives = 56 + 20 = 76. Bump two more by 2 strokes → 80.
    reid.set(2, 6); reid.set(14, 6);
    expect([...reid.values()].reduce((a, b) => a + b, 0)).toBe(80);

    const ham = new Map<number, number>();
    for (let h = 1; h <= 18; h++) ham.set(h, 4);
    // 18 fours = 72; need 82 → add 10 spread out
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].forEach((h) => ham.set(h, 5));
    expect([...ham.values()].reduce((a, b) => a + b, 0)).toBe(82);

    const r = computeDay1MatchResult(match, reid, ham);
    expect(r.p1TotalGross).toBe(80);
    expect(r.p2TotalGross).toBe(82);
    expect(r.p1TotalNet).toBe(80);
    expect(r.p2TotalNet).toBe(79); // 82 - 3 strokes
    expect(r.winnerId).toBe("ham");
    expect(r.p2TeamPoints).toBe(2);
    expect(r.p1TeamPoints).toBe(0);
  });

  it("strokes turn a gross loss into a tie", () => {
    // p1 gross 72, p2 gross 70, p1 gets 2 strokes → both 70 net → tie
    const match: Day1MatchInput = {
      p1Id: "a",
      p2Id: "b",
      strokeGiverId: "a",
      strokesGiven: 2,
    };
    const p1 = scores(Array(18).fill(4));
    const p2 = scores([3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]);
    const r = computeDay1MatchResult(match, p1, p2);
    expect(r.p1TotalGross).toBe(72);
    expect(r.p2TotalGross).toBe(70);
    expect(r.p1TotalNet).toBe(70);
    expect(r.p2TotalNet).toBe(70);
    expect(r.winnerId).toBeNull();
    expect(r.p1TeamPoints).toBe(1);
    expect(r.p2TeamPoints).toBe(1);
  });

  it("strokes apply to net diff while in progress", () => {
    // After 9 holes p2 is up 2 gross but giver=p2 with 4 strokes total: net diff
    // applies the full 4 strokes once, so p2 net = gross - 4.
    const match: Day1MatchInput = {
      p1Id: "a",
      p2Id: "b",
      strokeGiverId: "b",
      strokesGiven: 4,
    };
    const p1 = scores([4, 4, 4, 4, 4, 4, 4, 4, 4]); // 9 holes, 36 gross
    const p2 = scores([4, 4, 3, 4, 4, 3, 4, 4, 4]); // 9 holes, 34 gross
    const r = computeDay1MatchResult(match, p1, p2);
    expect(r.status).toBe("in_progress");
    expect(r.p1TotalGross).toBe(36);
    expect(r.p2TotalGross).toBe(34);
    // Net diff = p2Net - p1Net = (34-4) - 36 = -6 → p2 ahead by 6 net.
    expect(r.netDiff).toBe(-6);
  });
});
