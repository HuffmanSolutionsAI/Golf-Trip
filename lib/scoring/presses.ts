// Presses compute. (Plan A · Phase 4c)
//
// A press in this app is a buy-in per player tied to a singles match.
// When the match is final, the pot is allocated according to the result:
//   - Outright winner → takes the full pot.
//   - Halved (net diff = 0 at the finish) → split evenly between the
//     two players; rounding remainder reported as unallocated.
//   - In progress / pending → no payouts suggested yet; commissioner
//     can still settle manually if they want to.
//
// The match can be net or gross — but Day 1 already runs net stroke
// play with a stroke allocation, so press always uses net. The
// score_type rules_json field exists for symmetry with skins but is
// ignored for now; if commissioners ever want gross presses, the
// compute pipeline reads it.

import type { Day1MatchStateRow } from "@/lib/types";

export type PressResult = {
  status: "pending" | "in_progress" | "final" | "halved";
  winner_player_id: string | null;
  net_diff: number; // signed: + = p1 ahead, − = p2 ahead, 0 = halved
  payouts: Array<{
    recipient_player_id: string;
    amount_cents: number;
    note: string;
  }>;
  unallocated_cents: number;
};

export function computePress(args: {
  state: Day1MatchStateRow;
  pot_cents: number;
}): PressResult {
  const { state, pot_cents } = args;

  if (state.status === "pending" || state.status === "in_progress") {
    return {
      status: state.status,
      winner_player_id: null,
      net_diff: state.net_diff,
      payouts: [],
      unallocated_cents: pot_cents,
    };
  }

  // final
  if (state.net_diff === 0) {
    const half = Math.floor(pot_cents / 2);
    const remainder = pot_cents - half * 2;
    return {
      status: "halved",
      winner_player_id: null,
      net_diff: 0,
      payouts: [
        {
          recipient_player_id: state.player1_id,
          amount_cents: half,
          note: "Halved — split pot",
        },
        {
          recipient_player_id: state.player2_id,
          amount_cents: half,
          note: "Halved — split pot",
        },
      ],
      unallocated_cents: remainder,
    };
  }

  const winnerId =
    state.net_diff > 0 ? state.player1_id : state.player2_id;
  const margin = Math.abs(state.net_diff);
  return {
    status: "final",
    winner_player_id: winnerId,
    net_diff: state.net_diff,
    payouts: [
      {
        recipient_player_id: winnerId,
        amount_cents: pot_cents,
        note: `Won by ${margin} net`,
      },
    ],
    unallocated_cents: 0,
  };
}
