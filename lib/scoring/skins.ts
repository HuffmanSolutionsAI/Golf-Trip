// Skins compute. (Plan A · Phase 4b)
//
// A "skin" is awarded to the player with the lowest score on a hole, alone
// (no ties). When the low score is tied, the skin "carries over" — added
// to the next hole's pot. Carryover at the end of the round goes nowhere
// by default (commissioners can settle that as a tip/redistribute manually).
//
// Net skins: each player's full handicap (rounded half-up) is distributed
// across the holes by handicap_index — hardest hole (index=1) gets the
// first stroke. Holes without a handicap_index are excluded from the
// stroke-allocation distribution but still scored normally. A player with
// handicap > 18 gets second strokes starting again from index=1, etc.

import { roundHandicap } from "./handicaps";
import type { HoleRow, PlayerRow } from "@/lib/types";

export type ScoreType = "gross" | "net";

export type SkinsHoleResult = {
  hole_number: number;
  par: number;
  // The raw + adjusted scores of every participant who played the hole,
  // for transparency in the breakdown UI.
  participants: Array<{
    player_id: string;
    raw: number;
    adjusted: number;
    strokes_received: number;
  }>;
  winner_id: string | null;
  // How many skins this hole is worth — 1 + carryover from prior ties.
  skins_value: number;
  // The carryover that is now active going into the NEXT hole (0 if won).
  carryover_after: number;
};

export type SkinsResult = {
  score_type: ScoreType;
  holes: SkinsHoleResult[];
  totals: Array<{ player_id: string; skins_won: number }>;
  skins_total: number;
  // Skins still on carry at end of round (no winner). Not paid out by
  // default; commissioner decides what to do.
  carryover_remaining: number;
};

// strokes-per-hole for net: full handicap distributed by handicap_index
// ranking (1 = hardest = first stroke).
function strokesPerHole(
  player: { handicap: number },
  holes: HoleRow[],
): Map<number, number> {
  const total = roundHandicap(player.handicap);
  const out = new Map<number, number>();
  if (total <= 0) return out;
  const indexed = holes
    .filter((h) => h.handicap_index !== null)
    .sort((a, b) => (a.handicap_index as number) - (b.handicap_index as number));
  if (indexed.length === 0) return out;
  for (let i = 0; i < total; i++) {
    const h = indexed[i % indexed.length];
    out.set(h.hole_number, (out.get(h.hole_number) ?? 0) + 1);
  }
  return out;
}

export type ComputeSkinsArgs = {
  participants: PlayerRow[];
  holes: HoleRow[];
  // player_id → hole_number → strokes
  scoresByPlayer: Map<string, Map<number, number>>;
  scoreType: ScoreType;
};

export function computeSkins(args: ComputeSkinsArgs): SkinsResult {
  // Build each participant's stroke allocation once.
  const allocByPlayer = new Map<string, Map<number, number>>();
  for (const p of args.participants) {
    allocByPlayer.set(
      p.id,
      args.scoreType === "net"
        ? strokesPerHole(p, args.holes)
        : new Map<number, number>(),
    );
  }

  let carryover = 0;
  const skinsByPlayer = new Map<string, number>();
  const out: SkinsHoleResult[] = [];

  // Walk holes in their natural order so carryover flows hole 1 → 18.
  const orderedHoles = [...args.holes].sort(
    (a, b) => a.hole_number - b.hole_number,
  );

  for (const h of orderedHoles) {
    const rows: SkinsHoleResult["participants"] = [];
    let bestAdj = Infinity;
    let bestPlayers: string[] = [];

    for (const p of args.participants) {
      const raw = args.scoresByPlayer.get(p.id)?.get(h.hole_number);
      if (raw === undefined) continue;
      const strokes = allocByPlayer.get(p.id)?.get(h.hole_number) ?? 0;
      const adjusted = raw - strokes;
      rows.push({
        player_id: p.id,
        raw,
        adjusted,
        strokes_received: strokes,
      });
      if (adjusted < bestAdj) {
        bestAdj = adjusted;
        bestPlayers = [p.id];
      } else if (adjusted === bestAdj) {
        bestPlayers.push(p.id);
      }
    }

    // No participant played this hole, or every participant tied: carry.
    let winner: string | null = null;
    let value = 1 + carryover;
    let nextCarry = 0;
    if (rows.length === 0 || bestPlayers.length !== 1) {
      nextCarry = carryover + 1;
      value = 0; // unwon
    } else {
      winner = bestPlayers[0];
      skinsByPlayer.set(winner, (skinsByPlayer.get(winner) ?? 0) + value);
    }

    out.push({
      hole_number: h.hole_number,
      par: h.par,
      participants: rows,
      winner_id: winner,
      skins_value: value,
      carryover_after: nextCarry,
    });
    carryover = nextCarry;
  }

  const totals = Array.from(skinsByPlayer.entries())
    .map(([player_id, skins_won]) => ({ player_id, skins_won }))
    .sort((a, b) => b.skins_won - a.skins_won);
  const skinsTotal = totals.reduce((s, r) => s + r.skins_won, 0);

  return {
    score_type: args.scoreType,
    holes: out,
    totals,
    skins_total: skinsTotal,
    carryover_remaining: carryover,
  };
}

// Map a SkinsResult into a payouts proposal for the settle endpoint.
// Pot is divided evenly by skin (integer-cent floor); any rounding
// remainder is left unallocated (commissioner can add a row manually).
export function suggestSkinsPayouts(args: {
  result: SkinsResult;
  pot_cents: number;
}): {
  payouts: Array<{
    recipient_player_id: string;
    amount_cents: number;
    note: string;
  }>;
  per_skin_cents: number;
  unallocated_cents: number;
} {
  const { result, pot_cents } = args;
  if (result.skins_total === 0) {
    return { payouts: [], per_skin_cents: 0, unallocated_cents: pot_cents };
  }
  const perSkin = Math.floor(pot_cents / result.skins_total);
  const payouts = result.totals.map((row) => ({
    recipient_player_id: row.player_id,
    amount_cents: perSkin * row.skins_won,
    note: `${row.skins_won} skin${row.skins_won === 1 ? "" : "s"}`,
  }));
  const totalPaid = payouts.reduce((s, p) => s + p.amount_cents, 0);
  return {
    payouts,
    per_skin_cents: perSkin,
    unallocated_cents: pot_cents - totalPaid,
  };
}
