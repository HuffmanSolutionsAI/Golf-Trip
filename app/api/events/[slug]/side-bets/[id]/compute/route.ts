import { NextResponse } from "next/server";
import { checkCommissioner } from "@/lib/auth/eventPermissions";
import { runWithEvent } from "@/lib/repo/events";
import { getSideBet, listEntries } from "@/lib/repo/sideBets";
import { listHoles } from "@/lib/repo/rounds";
import { getPlayer } from "@/lib/repo/players";
import { getDb } from "@/lib/db";
import { computeSkins, suggestSkinsPayouts } from "@/lib/scoring/skins";
import type { HoleScoreRow, PlayerRow } from "@/lib/types";

export const runtime = "nodejs";

// Compute a settlement preview for typed bets. (Plan A · Phase 4b)
//
// Currently only 'skins' is implemented; other typed bets fall through
// with 400 'not yet supported'. Returns the breakdown + suggested
// payouts the commissioner can review and confirm via /settle.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const guard = await checkCommissioner(slug);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const result = runWithEvent(slug, () => {
    const bet = getSideBet(id);
    if (!bet) return { error: "Unknown bet.", status: 404 } as const;
    if (bet.status === "settled") {
      return { error: "Bet is already settled.", status: 409 } as const;
    }
    if (bet.type !== "skins") {
      return {
        error: `Auto-compute isn't implemented for '${bet.type}' yet — settle manually.`,
        status: 400,
      } as const;
    }
    if (!bet.round_id) {
      return {
        error: "Skins bets must be tied to a round before computing.",
        status: 400,
      } as const;
    }
    const entries = listEntries(bet.id);
    const playerIds = entries
      .map((e) => e.player_id)
      .filter((p): p is string => !!p);
    if (playerIds.length === 0) {
      return {
        error: "Add at least one player participant before computing.",
        status: 400,
      } as const;
    }
    const participants: PlayerRow[] = [];
    for (const pid of playerIds) {
      const p = getPlayer(pid);
      if (p) participants.push(p);
    }

    const holes = listHoles(bet.round_id);
    const db = getDb();
    const allScores = db
      .prepare(
        `SELECT * FROM hole_scores
           WHERE round_id = ?
             AND player_id IN (${playerIds.map(() => "?").join(",")})`,
      )
      .all(bet.round_id, ...playerIds) as HoleScoreRow[];
    const scoresByPlayer = new Map<string, Map<number, number>>();
    for (const s of allScores) {
      if (!s.player_id) continue;
      let inner = scoresByPlayer.get(s.player_id);
      if (!inner) {
        inner = new Map();
        scoresByPlayer.set(s.player_id, inner);
      }
      inner.set(s.hole_number, s.strokes);
    }

    let scoreType: "gross" | "net" = "gross";
    if (bet.rules_json) {
      try {
        const rules = JSON.parse(bet.rules_json) as { score_type?: string };
        if (rules.score_type === "net" || rules.score_type === "gross") {
          scoreType = rules.score_type;
        }
      } catch {
        /* fall back to gross */
      }
    }

    const skins = computeSkins({
      participants,
      holes,
      scoresByPlayer,
      scoreType,
    });
    const proposal = suggestSkinsPayouts({
      result: skins,
      pot_cents: bet.buy_in_cents * entries.length,
    });

    return {
      ok: true as const,
      bet_id: bet.id,
      score_type: scoreType,
      pot_cents: bet.buy_in_cents * entries.length,
      per_skin_cents: proposal.per_skin_cents,
      unallocated_cents: proposal.unallocated_cents,
      carryover_remaining: skins.carryover_remaining,
      breakdown: skins.holes.map((h) => ({
        hole_number: h.hole_number,
        par: h.par,
        winner_id: h.winner_id,
        skins_value: h.skins_value,
        carryover_after: h.carryover_after,
        scores: h.participants.map((p) => ({
          player_id: p.player_id,
          raw: p.raw,
          adjusted: p.adjusted,
          strokes: p.strokes_received,
        })),
      })),
      payouts: proposal.payouts,
    };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
