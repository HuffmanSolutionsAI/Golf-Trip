// Calcutta compute. (Plan A · Phase 4d)
//
// A calcutta is an auction pool. Pre-event, each team is sold to the
// highest bidder; that bidder "owns" the team for the event. The pot is
// the sum of bids. After the event, the pot is paid out to bidders based
// on where their teams finished in the standings, scaled by a configurable
// percentage schedule (defaults to 50/25/15/10).
//
// We don't enforce that team-bidder bids cover every team in the field —
// commissioners can run a calcutta for a subset (e.g. the Day 3 teams
// only) and the math still works.
//
// Tie handling: if two teams share a rank, they split the combined slot
// payouts evenly. E.g. teams tied for 1st split (1st_pct + 2nd_pct)/2.
// Schedule slots beyond the number of teams are ignored.

export type CalcuttaLot = {
  team_id: string;
  bidder_player_id: string;
  bid_cents: number;
};

// Leaderboard rows in finishing order. We accept just what we need rather
// than coupling to the full LeaderboardRow shape so unit tests don't
// have to fabricate every column.
export type CalcuttaStanding = {
  team_id: string;
  rank: number;
};

export type CalcuttaResult = {
  pot_cents: number;
  schedule_pct: number[];
  // Per-team allocation showing which schedule slots they earned.
  team_allocations: Array<{
    team_id: string;
    rank: number;
    bidder_player_id: string;
    bid_cents: number;
    payout_cents: number;
    note: string;
  }>;
  // Aggregated payouts per bidder (multiple lots → summed).
  payouts: Array<{
    recipient_player_id: string;
    amount_cents: number;
    note: string;
  }>;
  unallocated_cents: number;
};

export function computeCalcutta(args: {
  lots: CalcuttaLot[];
  standings: CalcuttaStanding[];
  schedule_pct: number[]; // e.g. [50, 25, 15, 10]
}): CalcuttaResult {
  const pot = args.lots.reduce((s, l) => s + l.bid_cents, 0);

  // Group teams by rank to handle ties.
  const ranks = new Map<number, string[]>();
  for (const s of args.standings) {
    const arr = ranks.get(s.rank) ?? [];
    arr.push(s.team_id);
    ranks.set(s.rank, arr);
  }

  // Schedule slots are 0-indexed; index 0 = 1st place share, etc. When
  // teams tie, they pool their slots' shares and split evenly.
  // We sort the rank groups in ascending rank order so slot allocation
  // proceeds 1st-place first.
  const sortedRanks = [...ranks.entries()].sort((a, b) => a[0] - b[0]);
  let nextSlot = 0;
  const sharePctByTeam = new Map<string, number>();
  for (const [, teamIds] of sortedRanks) {
    if (nextSlot >= args.schedule_pct.length) break;
    const slotsClaimed = args.schedule_pct.slice(
      nextSlot,
      nextSlot + teamIds.length,
    );
    const sumPct = slotsClaimed.reduce((s, p) => s + p, 0);
    const perTeamPct = sumPct / teamIds.length;
    for (const tid of teamIds) sharePctByTeam.set(tid, perTeamPct);
    nextSlot += teamIds.length;
  }

  const lotsByTeam = new Map<string, CalcuttaLot>();
  for (const l of args.lots) lotsByTeam.set(l.team_id, l);

  const teamAllocations: CalcuttaResult["team_allocations"] = [];
  const bidderPayoutCents = new Map<string, number>();
  const bidderTeams = new Map<string, string[]>();

  for (const [, teamIds] of sortedRanks) {
    for (const tid of teamIds) {
      const lot = lotsByTeam.get(tid);
      if (!lot) continue;
      const pct = sharePctByTeam.get(tid) ?? 0;
      const amount = pct > 0 ? Math.floor((pot * pct) / 100) : 0;
      const standing = args.standings.find((s) => s.team_id === tid)!;
      teamAllocations.push({
        team_id: tid,
        rank: standing.rank,
        bidder_player_id: lot.bidder_player_id,
        bid_cents: lot.bid_cents,
        payout_cents: amount,
        note: pct > 0 ? `${pct}% (rank ${standing.rank})` : `rank ${standing.rank}`,
      });
      if (amount > 0) {
        bidderPayoutCents.set(
          lot.bidder_player_id,
          (bidderPayoutCents.get(lot.bidder_player_id) ?? 0) + amount,
        );
        const teams = bidderTeams.get(lot.bidder_player_id) ?? [];
        teams.push(tid);
        bidderTeams.set(lot.bidder_player_id, teams);
      }
    }
  }

  const payouts = Array.from(bidderPayoutCents.entries())
    .map(([bidder, cents]) => {
      const teams = bidderTeams.get(bidder) ?? [];
      return {
        recipient_player_id: bidder,
        amount_cents: cents,
        note:
          teams.length === 1
            ? `Owned ${teams.length} team`
            : `Owned ${teams.length} teams`,
      };
    })
    .sort((a, b) => b.amount_cents - a.amount_cents);

  const totalPaid = payouts.reduce((s, p) => s + p.amount_cents, 0);
  return {
    pot_cents: pot,
    schedule_pct: args.schedule_pct,
    team_allocations: teamAllocations,
    payouts,
    unallocated_cents: pot - totalPaid,
  };
}
