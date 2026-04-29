import { describe, it, expect } from "vitest";
import { computeCalcutta } from "../calcutta";

describe("computeCalcutta", () => {
  it("standard 50/25/15/10 split with four teams, four bidders, no ties", () => {
    const r = computeCalcutta({
      lots: [
        { team_id: "t1", bidder_player_id: "alice", bid_cents: 5000 },
        { team_id: "t2", bidder_player_id: "bob", bid_cents: 3000 },
        { team_id: "t3", bidder_player_id: "carol", bid_cents: 1500 },
        { team_id: "t4", bidder_player_id: "dave", bid_cents: 500 },
      ],
      standings: [
        { team_id: "t3", rank: 1 },
        { team_id: "t1", rank: 2 },
        { team_id: "t4", rank: 3 },
        { team_id: "t2", rank: 4 },
      ],
      schedule_pct: [50, 25, 15, 10],
    });
    // pot = 10000, t3 wins 50% = 5000 → carol; t1 25% = 2500 → alice; t4 15% = 1500 → dave; t2 10% = 1000 → bob
    expect(r.pot_cents).toBe(10000);
    expect(r.payouts).toEqual([
      { recipient_player_id: "carol", amount_cents: 5000, note: "Owned 1 team" },
      { recipient_player_id: "alice", amount_cents: 2500, note: "Owned 1 team" },
      { recipient_player_id: "dave", amount_cents: 1500, note: "Owned 1 team" },
      { recipient_player_id: "bob", amount_cents: 1000, note: "Owned 1 team" },
    ]);
    expect(r.unallocated_cents).toBe(0);
  });

  it("two-way tie at 1st: average the 1st + 2nd shares", () => {
    const r = computeCalcutta({
      lots: [
        { team_id: "t1", bidder_player_id: "alice", bid_cents: 5000 },
        { team_id: "t2", bidder_player_id: "bob", bid_cents: 5000 },
      ],
      standings: [
        { team_id: "t1", rank: 1 },
        { team_id: "t2", rank: 1 },
      ],
      schedule_pct: [50, 25],
    });
    // pot = 10000; tied 1st split (50+25)/2 = 37.5% each = 3750 each
    expect(r.payouts).toEqual([
      { recipient_player_id: "alice", amount_cents: 3750, note: "Owned 1 team" },
      { recipient_player_id: "bob", amount_cents: 3750, note: "Owned 1 team" },
    ]);
    expect(r.unallocated_cents).toBe(2500); // 25% slot was consumed by the tie pool
  });

  it("schedule shorter than field: only top N get paid", () => {
    const r = computeCalcutta({
      lots: [
        { team_id: "t1", bidder_player_id: "alice", bid_cents: 1000 },
        { team_id: "t2", bidder_player_id: "bob", bid_cents: 1000 },
        { team_id: "t3", bidder_player_id: "carol", bid_cents: 1000 },
      ],
      standings: [
        { team_id: "t1", rank: 1 },
        { team_id: "t2", rank: 2 },
        { team_id: "t3", rank: 3 },
      ],
      schedule_pct: [60, 40], // only top 2 paid
    });
    expect(r.payouts).toEqual([
      { recipient_player_id: "alice", amount_cents: 1800, note: "Owned 1 team" },
      { recipient_player_id: "bob", amount_cents: 1200, note: "Owned 1 team" },
    ]);
  });

  it("one bidder owns multiple winning teams: payouts aggregate", () => {
    const r = computeCalcutta({
      lots: [
        { team_id: "t1", bidder_player_id: "alice", bid_cents: 4000 },
        { team_id: "t2", bidder_player_id: "alice", bid_cents: 3000 },
        { team_id: "t3", bidder_player_id: "bob", bid_cents: 3000 },
      ],
      standings: [
        { team_id: "t1", rank: 1 },
        { team_id: "t2", rank: 2 },
        { team_id: "t3", rank: 3 },
      ],
      schedule_pct: [50, 25, 25],
    });
    // pot = 10000; alice owns 1st (5000) + 2nd (2500) = 7500; bob owns 3rd (2500)
    expect(r.payouts[0]).toEqual({
      recipient_player_id: "alice",
      amount_cents: 7500,
      note: "Owned 2 teams",
    });
    expect(r.payouts[1]).toEqual({
      recipient_player_id: "bob",
      amount_cents: 2500,
      note: "Owned 1 team",
    });
  });

  it("rounding leaves remainder unallocated", () => {
    const r = computeCalcutta({
      lots: [
        { team_id: "t1", bidder_player_id: "alice", bid_cents: 1001 },
        { team_id: "t2", bidder_player_id: "bob", bid_cents: 1000 },
        { team_id: "t3", bidder_player_id: "carol", bid_cents: 1000 },
      ],
      standings: [
        { team_id: "t1", rank: 1 },
        { team_id: "t2", rank: 2 },
        { team_id: "t3", rank: 3 },
      ],
      schedule_pct: [50, 30, 20],
    });
    // pot 3001; floor(3001 * .5) = 1500, .3 = 900, .2 = 600 → 3000 paid, 1 unallocated
    expect(r.unallocated_cents).toBe(1);
  });

  it("missing lot for a ranked team: that rank's share goes unallocated", () => {
    const r = computeCalcutta({
      lots: [
        { team_id: "t1", bidder_player_id: "alice", bid_cents: 5000 },
        { team_id: "t3", bidder_player_id: "bob", bid_cents: 5000 },
      ],
      standings: [
        { team_id: "t1", rank: 1 },
        { team_id: "t2", rank: 2 }, // no bidder
        { team_id: "t3", rank: 3 },
      ],
      schedule_pct: [50, 30, 20],
    });
    // Alice gets 50% = 5000; t2 gets 30% but no bidder → unallocated; bob gets 20% = 2000
    expect(r.payouts).toEqual([
      { recipient_player_id: "alice", amount_cents: 5000, note: "Owned 1 team" },
      { recipient_player_id: "bob", amount_cents: 2000, note: "Owned 1 team" },
    ]);
    expect(r.unallocated_cents).toBe(3000);
  });
});
