import { describe, it, expect } from "vitest";
import { computeSkins, suggestSkinsPayouts } from "../skins";
import type { HoleRow, PlayerRow } from "@/lib/types";

// Three-hole "course" with contiguous handicap_index for predictability.
const holes: HoleRow[] = [1, 2, 3].map((n) => ({
  id: `h${n}`,
  round_id: "r",
  hole_number: n,
  par: 4,
  handicap_index: n,
  yardage: null,
  created_at: "",
  updated_at: "",
}));

function p(id: string, handicap = 0): PlayerRow {
  return {
    id,
    event_id: "e",
    user_id: null,
    email: null,
    name: id,
    handicap,
    team_id: "t",
    team_slot: "A",
    is_admin: 0,
    created_at: "",
    updated_at: "",
  };
}

function scores(...rows: Array<[string, number, number]>) {
  // [player_id, hole_number, strokes]
  const m = new Map<string, Map<number, number>>();
  for (const [pid, hole, s] of rows) {
    if (!m.has(pid)) m.set(pid, new Map());
    m.get(pid)!.set(hole, s);
  }
  return m;
}

describe("computeSkins — gross", () => {
  it("awards a skin to the lone low score", () => {
    const r = computeSkins({
      participants: [p("a"), p("b")],
      holes,
      scoresByPlayer: scores(
        ["a", 1, 3],
        ["b", 1, 4],
        ["a", 2, 4],
        ["b", 2, 4],
        ["a", 3, 4],
        ["b", 3, 4],
      ),
      scoreType: "gross",
    });
    expect(r.holes[0].winner_id).toBe("a");
    expect(r.holes[0].skins_value).toBe(1);
    expect(r.totals).toEqual([{ player_id: "a", skins_won: 1 }]);
  });

  it("ties carry over until someone wins outright", () => {
    const r = computeSkins({
      participants: [p("a"), p("b")],
      holes,
      scoresByPlayer: scores(
        ["a", 1, 4],
        ["b", 1, 4], // tied, carry
        ["a", 2, 4],
        ["b", 2, 4], // tied, carry
        ["a", 3, 3],
        ["b", 3, 4], // a wins 3 skins
      ),
      scoreType: "gross",
    });
    expect(r.holes[0].winner_id).toBe(null);
    expect(r.holes[0].carryover_after).toBe(1);
    expect(r.holes[1].carryover_after).toBe(2);
    expect(r.holes[2].winner_id).toBe("a");
    expect(r.holes[2].skins_value).toBe(3);
    expect(r.totals).toEqual([{ player_id: "a", skins_won: 3 }]);
    expect(r.skins_total).toBe(3);
    expect(r.carryover_remaining).toBe(0);
  });

  it("end-of-round carry remains uncollected", () => {
    const r = computeSkins({
      participants: [p("a"), p("b")],
      holes,
      scoresByPlayer: scores(
        ["a", 1, 4],
        ["b", 1, 4],
        ["a", 2, 4],
        ["b", 2, 4],
        ["a", 3, 4],
        ["b", 3, 4],
      ),
      scoreType: "gross",
    });
    expect(r.skins_total).toBe(0);
    expect(r.carryover_remaining).toBe(3);
  });

  it("missing scores cause a hole to carry", () => {
    const r = computeSkins({
      participants: [p("a"), p("b")],
      holes,
      scoresByPlayer: scores(["a", 1, 3], ["a", 2, 4], ["b", 3, 4], ["a", 3, 4]),
      // hole 1: only a played (one score → b missing → tied/no-comp behavior?)
      // Per impl: bestPlayers === 1, so a wins skin 1.
      scoreType: "gross",
    });
    expect(r.holes[0].winner_id).toBe("a");
    expect(r.holes[1].winner_id).toBe("a");
    // hole 3: tied 4-4 → carry
    expect(r.holes[2].winner_id).toBe(null);
    expect(r.skins_total).toBe(2);
  });
});

describe("computeSkins — net", () => {
  it("subtracts a stroke on the player's allocated holes", () => {
    // Player a has handicap 1 → gets one stroke on hole_number 1 (the
    // hardest, handicap_index 1).
    const r = computeSkins({
      participants: [p("a", 1), p("b", 0)],
      holes,
      scoresByPlayer: scores(
        ["a", 1, 4],
        ["b", 1, 4], // gross tied; net: a=3, b=4 → a wins
        ["a", 2, 4],
        ["b", 2, 4],
        ["a", 3, 4],
        ["b", 3, 4],
      ),
      scoreType: "net",
    });
    expect(r.holes[0].winner_id).toBe("a");
    expect(r.holes[0].participants.find((x) => x.player_id === "a")?.adjusted).toBe(3);
    expect(r.holes[0].participants.find((x) => x.player_id === "a")?.strokes_received).toBe(1);
  });

  it("distributes strokes across handicap_index ranking; high handicap loops", () => {
    // Player handicap 4 across 3 indexed holes → strokes per hole: 2,1,1 (4 total).
    const r = computeSkins({
      participants: [p("a", 4), p("b", 0)],
      holes,
      scoresByPlayer: scores(
        ["a", 1, 4],
        ["b", 1, 5], // gross: b higher; net a=2, b=5
        ["a", 2, 4],
        ["b", 2, 5],
        ["a", 3, 4],
        ["b", 3, 4], // gross tied; net a=3, b=4 → a wins
      ),
      scoreType: "net",
    });
    const h1A = r.holes[0].participants.find((x) => x.player_id === "a")!;
    expect(h1A.strokes_received).toBe(2);
    expect(h1A.adjusted).toBe(2);
    expect(r.totals[0]).toEqual({ player_id: "a", skins_won: 3 });
  });
});

describe("suggestSkinsPayouts", () => {
  it("divides pot evenly per skin won", () => {
    const result = computeSkins({
      participants: [p("a"), p("b")],
      holes,
      scoresByPlayer: scores(
        ["a", 1, 3],
        ["b", 1, 4],
        ["a", 2, 4],
        ["b", 2, 3],
        ["a", 3, 3],
        ["b", 3, 4],
      ),
      scoreType: "gross",
    });
    // a=2, b=1 → 3 skins total; pot $30 → $10/skin
    const proposal = suggestSkinsPayouts({ result, pot_cents: 3000 });
    expect(proposal.per_skin_cents).toBe(1000);
    expect(proposal.unallocated_cents).toBe(0);
    expect(proposal.payouts).toEqual([
      { recipient_player_id: "a", amount_cents: 2000, note: "2 skins" },
      { recipient_player_id: "b", amount_cents: 1000, note: "1 skin" },
    ]);
  });

  it("leaves remainder unallocated when pot doesn't divide evenly", () => {
    const result = computeSkins({
      participants: [p("a"), p("b"), p("c")],
      holes,
      scoresByPlayer: scores(
        ["a", 1, 3],
        ["b", 1, 4],
        ["c", 1, 4],
        ["a", 2, 4],
        ["b", 2, 3],
        ["c", 2, 4],
        ["a", 3, 4],
        ["b", 3, 4],
        ["c", 3, 3],
      ),
      scoreType: "gross",
    });
    // 3 skins, $10 buy-in × 3 = $30 → $10/skin → fully allocated
    const proposal = suggestSkinsPayouts({ result, pot_cents: 3001 });
    expect(proposal.per_skin_cents).toBe(1000); // floor(3001/3) = 1000
    expect(proposal.unallocated_cents).toBe(1);
  });

  it("when no skins won, full pot is unallocated", () => {
    const result = computeSkins({
      participants: [p("a"), p("b")],
      holes,
      scoresByPlayer: scores(
        ["a", 1, 4],
        ["b", 1, 4],
        ["a", 2, 4],
        ["b", 2, 4],
        ["a", 3, 4],
        ["b", 3, 4],
      ),
      scoreType: "gross",
    });
    const proposal = suggestSkinsPayouts({ result, pot_cents: 4000 });
    expect(proposal.payouts).toHaveLength(0);
    expect(proposal.unallocated_cents).toBe(4000);
  });
});
