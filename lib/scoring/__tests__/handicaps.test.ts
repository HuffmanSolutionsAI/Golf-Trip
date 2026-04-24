import { describe, it, expect } from "vitest";
import { roundHandicap, computeStrokeAllocation } from "../handicaps";

describe("roundHandicap", () => {
  it("rounds half up (7.5 -> 8)", () => {
    expect(roundHandicap(7.5)).toBe(8);
  });
  it("rounds 7.3 -> 7, 7.6 -> 8", () => {
    expect(roundHandicap(7.3)).toBe(7);
    expect(roundHandicap(7.6)).toBe(8);
  });
  it("rounds 2.9 -> 3, 34.9 -> 35", () => {
    expect(roundHandicap(2.9)).toBe(3);
    expect(roundHandicap(34.9)).toBe(35);
  });
  it("rounds integers to themselves", () => {
    expect(roundHandicap(10)).toBe(10);
    expect(roundHandicap(0)).toBe(0);
  });
});

// 18-hole handicap_index 1..18 (Talamore-style, contiguous). Used for strokeHoles assertions.
const holes18 = Array.from({ length: 18 }, (_, i) => ({
  hole_number: i + 1,
  handicap_index: i + 1,
}));

describe("computeStrokeAllocation — within-1 rule", () => {
  it("0 gap → no strokes", () => {
    const r = computeStrokeAllocation(
      { id: "a", handicap: 15.0 },
      { id: "b", handicap: 15.2 },
      holes18,
    );
    expect(r.strokeGiverId).toBeNull();
    expect(r.strokesGiven).toBe(0);
    expect(r.strokeHoles).toEqual([]);
  });

  it("1 gap → no strokes", () => {
    const r = computeStrokeAllocation(
      { id: "a", handicap: 12.1 },
      { id: "b", handicap: 10.8 },
      holes18,
    );
    expect(r.strokeGiverId).toBeNull();
    expect(r.strokesGiven).toBe(0);
  });

  it("2 gap → 2 strokes on hardest 2 holes", () => {
    const r = computeStrokeAllocation(
      { id: "a", handicap: 23.0 },
      { id: "b", handicap: 21.3 },
      holes18,
    );
    expect(r.strokeGiverId).toBe("a");
    expect(r.strokesGiven).toBe(2);
    // With index 1..18, hardest two by index are holes 1 and 2.
    expect(r.strokeHoles).toEqual([1, 2]);
  });

  it("15 gap → capped at 11 strokes", () => {
    const r = computeStrokeAllocation(
      { id: "bot", handicap: 34.9 },
      { id: "bennett", handicap: 19.8 },
      holes18,
    );
    expect(r.strokeGiverId).toBe("bot");
    expect(r.strokesGiven).toBe(11);
    expect(r.strokeHoles).toHaveLength(11);
    expect(r.strokeHoles).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it("returns empty strokeHoles when handicap_index data is missing (Holly pre-fill)", () => {
    const hollyHoles = Array.from({ length: 18 }, (_, i) => ({
      hole_number: i + 1,
      handicap_index: null,
    }));
    const r = computeStrokeAllocation(
      { id: "a", handicap: 3 },
      { id: "b", handicap: 10 },
      hollyHoles,
    );
    // Strokes are known (7) but can't be allocated yet.
    expect(r.strokeGiverId).toBe("b");
    expect(r.strokesGiven).toBe(7);
    expect(r.strokeHoles).toEqual([]);
  });
});

// Required by §10.7 — every Day 1 matchup at current handicaps.
describe("Day 1 matchup allocations (current handicaps)", () => {
  const cases = [
    { m: 1,  p1: { id: "reid",    h: 2.9  }, p2: { id: "pincus",  h: 6.7  }, giver: "pincus",  strokes: 4  },
    { m: 2,  p1: { id: "tom",     h: 12.9 }, p2: { id: "ham",     h: 7.3  }, giver: "tom",     strokes: 6  },
    { m: 3,  p1: { id: "luke",    h: 14.9 }, p2: { id: "bands",   h: 15.2 }, giver: null,      strokes: 0  },
    { m: 4,  p1: { id: "bot",     h: 34.9 }, p2: { id: "bennett", h: 19.8 }, giver: "bot",     strokes: 11 },
    { m: 5,  p1: { id: "foley",   h: 15.0 }, p2: { id: "davis",   h: 15.2 }, giver: null,      strokes: 0  },
    { m: 6,  p1: { id: "byrnes",  h: 12.1 }, p2: { id: "mcardle", h: 10.8 }, giver: null,      strokes: 0  },
    { m: 7,  p1: { id: "matkins", h: 23.6 }, p2: { id: "cota",    h: 20.0 }, giver: "matkins", strokes: 4  },
    { m: 8,  p1: { id: "mallen",  h: 23.0 }, p2: { id: "mason",   h: 21.3 }, giver: "mallen",  strokes: 2  },
    { m: 9,  p1: { id: "ric",     h: 11.0 }, p2: { id: "mellis",  h: 9.0  }, giver: "ric",     strokes: 2  },
    { m: 10, p1: { id: "nate",    h: 7.4  }, p2: { id: "keller",  h: 7.6  }, giver: null,      strokes: 0  },
  ] as const;

  for (const c of cases) {
    it(`match ${c.m}: ${c.p1.id}(${c.p1.h}) vs ${c.p2.id}(${c.p2.h})`, () => {
      const r = computeStrokeAllocation(
        { id: c.p1.id, handicap: c.p1.h },
        { id: c.p2.id, handicap: c.p2.h },
        holes18,
      );
      expect(r.strokeGiverId).toBe(c.giver);
      expect(r.strokesGiven).toBe(c.strokes);
      expect(r.strokeHoles).toHaveLength(c.strokes);
    });
  }
});
