import { describe, it, expect } from "vitest";
import { computePress } from "../presses";
import type { Day1MatchStateRow } from "@/lib/types";

function state(overrides: Partial<Day1MatchStateRow>): Day1MatchStateRow {
  return {
    match_id: "m1",
    round_id: "r1",
    match_number: 1,
    player1_id: "a",
    player2_id: "b",
    stroke_giver_id: null,
    strokes_given: 0,
    p1_total_gross: 0,
    p2_total_gross: 0,
    p1_total_net: 0,
    p2_total_net: 0,
    p1_holes: 0,
    p2_holes: 0,
    holes_both_played: 0,
    net_diff: 0,
    status: "pending",
    winner_player_id: null,
    p1_team_points: 0,
    p2_team_points: 0,
    ...overrides,
  };
}

describe("computePress", () => {
  it("pending match returns no payouts; pot is unallocated", () => {
    const r = computePress({
      state: state({ status: "pending" }),
      pot_cents: 4000,
    });
    expect(r.status).toBe("pending");
    expect(r.payouts).toHaveLength(0);
    expect(r.unallocated_cents).toBe(4000);
  });

  it("in-progress match returns no payouts (commissioner shouldn't auto-settle yet)", () => {
    const r = computePress({
      state: state({ status: "in_progress", net_diff: 2 }),
      pot_cents: 4000,
    });
    expect(r.status).toBe("in_progress");
    expect(r.payouts).toHaveLength(0);
  });

  it("final win pays full pot to winner with margin note (p1 ahead)", () => {
    const r = computePress({
      state: state({ status: "final", net_diff: 3 }),
      pot_cents: 4000,
    });
    expect(r.status).toBe("final");
    expect(r.winner_player_id).toBe("a");
    expect(r.payouts).toEqual([
      { recipient_player_id: "a", amount_cents: 4000, note: "Won by 3 net" },
    ]);
    expect(r.unallocated_cents).toBe(0);
  });

  it("final win to p2 when net_diff is negative", () => {
    const r = computePress({
      state: state({ status: "final", net_diff: -2 }),
      pot_cents: 4000,
    });
    expect(r.winner_player_id).toBe("b");
    expect(r.payouts[0].recipient_player_id).toBe("b");
    expect(r.payouts[0].note).toBe("Won by 2 net");
  });

  it("halved match splits evenly", () => {
    const r = computePress({
      state: state({ status: "final", net_diff: 0 }),
      pot_cents: 4000,
    });
    expect(r.status).toBe("halved");
    expect(r.winner_player_id).toBe(null);
    expect(r.payouts).toHaveLength(2);
    expect(r.payouts[0].amount_cents).toBe(2000);
    expect(r.payouts[1].amount_cents).toBe(2000);
    expect(r.unallocated_cents).toBe(0);
  });

  it("halved match with odd cents leaves remainder unallocated", () => {
    const r = computePress({
      state: state({ status: "final", net_diff: 0 }),
      pot_cents: 4001,
    });
    expect(r.payouts[0].amount_cents).toBe(2000);
    expect(r.payouts[1].amount_cents).toBe(2000);
    expect(r.unallocated_cents).toBe(1);
  });
});
