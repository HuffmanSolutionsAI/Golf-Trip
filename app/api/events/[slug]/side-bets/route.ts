import { NextResponse } from "next/server";
import { z } from "zod";
import { checkCommissioner } from "@/lib/auth/eventPermissions";
import { runWithEvent } from "@/lib/repo/events";
import { createSideBet, addPlayerEntry, addTeamEntry } from "@/lib/repo/sideBets";
import { getDb } from "@/lib/db";
import { emitChange } from "@/lib/events";

export const runtime = "nodejs";

// Create a side bet. (Plan A · Phase 4a)
//
// MVP only ships type='custom'. The other types compile (schema accepts
// them) but no auto-settle logic exists yet, so the commissioner has to
// settle them manually like a custom bet.
const RulesSchema = z.object({
  score_type: z.enum(["gross", "net"]).optional(),
  match_id: z.string().min(1).optional(),
  hole_number: z.number().int().min(1).max(18).optional(),
  // Calcutta: percentages by finishing rank, e.g. [50, 25, 15, 10].
  // Slot 0 = 1st place share. Sum is not required to equal 100 — some
  // events keep a holdback for a separate side pot.
  payout_schedule: z.array(z.number().min(0).max(100)).max(20).optional(),
});

const Body = z.object({
  type: z
    .enum(["custom", "skins", "presses", "ctp", "long_drive", "calcutta"])
    .default("custom"),
  name: z.string().min(1).max(80),
  description: z.string().max(400).optional(),
  buy_in_cents: z.number().int().min(0).max(1_000_000).default(0),
  round_id: z.string().min(1).optional(),
  player_ids: z.array(z.string().min(1)).optional(),
  team_ids: z.array(z.string().min(1)).optional(),
  rules: RulesSchema.optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const guard = await checkCommissioner(slug);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const db = getDb();
  if (parsed.data.round_id) {
    const ok = db
      .prepare(`SELECT 1 FROM rounds WHERE id = ? AND event_id = ?`)
      .get(parsed.data.round_id, slug);
    if (!ok) {
      return NextResponse.json({ error: "Unknown round." }, { status: 400 });
    }
  }

  // Validate any pre-supplied participants belong to the event.
  for (const pid of parsed.data.player_ids ?? []) {
    const ok = db
      .prepare(`SELECT 1 FROM players WHERE id = ? AND event_id = ?`)
      .get(pid, slug);
    if (!ok) {
      return NextResponse.json(
        { error: `Player ${pid} doesn't belong to this event.` },
        { status: 400 },
      );
    }
  }
  for (const tid of parsed.data.team_ids ?? []) {
    const ok = db
      .prepare(`SELECT 1 FROM teams WHERE id = ? AND event_id = ?`)
      .get(tid, slug);
    if (!ok) {
      return NextResponse.json(
        { error: `Team ${tid} doesn't belong to this event.` },
        { status: 400 },
      );
    }
  }

  // Skins must be tied to a round so the compute endpoint has scores to read.
  if (parsed.data.type === "skins" && !parsed.data.round_id) {
    return NextResponse.json(
      { error: "Skins bets need a round." },
      { status: 400 },
    );
  }

  // Presses are tied to a singles match; validate it exists and grab the
  // two players so we can auto-add them as participants below.
  let pressMatch: { id: string; round_id: string; player1_id: string; player2_id: string } | null = null;
  if (parsed.data.type === "presses") {
    const matchId = parsed.data.rules?.match_id;
    if (!matchId) {
      return NextResponse.json(
        { error: "Press bets need a match." },
        { status: 400 },
      );
    }
    const m = db
      .prepare(
        `SELECT m.id, m.round_id, m.player1_id, m.player2_id
           FROM matches m
           JOIN rounds r ON r.id = m.round_id
           WHERE m.id = ? AND r.event_id = ?`,
      )
      .get(matchId, slug) as
      | { id: string; round_id: string; player1_id: string; player2_id: string }
      | undefined;
    if (!m) {
      return NextResponse.json(
        { error: "Press match doesn't belong to this event." },
        { status: 400 },
      );
    }
    pressMatch = m;
  }

  // Compose rules_json depending on type.
  let rulesJson: string | null = null;
  if (parsed.data.type === "skins") {
    rulesJson = JSON.stringify({
      score_type: parsed.data.rules?.score_type ?? "gross",
    });
  } else if (parsed.data.type === "presses" && pressMatch) {
    rulesJson = JSON.stringify({
      match_id: pressMatch.id,
      score_type: "net",
    });
  } else if (parsed.data.type === "ctp" || parsed.data.type === "long_drive") {
    if (parsed.data.rules?.hole_number !== undefined) {
      rulesJson = JSON.stringify({
        hole_number: parsed.data.rules.hole_number,
      });
    }
  } else if (parsed.data.type === "calcutta") {
    rulesJson = JSON.stringify({
      payout_schedule: parsed.data.rules?.payout_schedule ?? [50, 25, 15, 10],
    });
  } else if (parsed.data.rules) {
    rulesJson = JSON.stringify(parsed.data.rules);
  }

  const result = runWithEvent(slug, () => {
    const bet = createSideBet(slug, {
      type: parsed.data.type,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      buy_in_cents: parsed.data.buy_in_cents,
      round_id:
        parsed.data.round_id ?? (pressMatch ? pressMatch.round_id : null),
      rules_json: rulesJson,
    });
    // Press: auto-add the two players in the match if no explicit list given.
    if (
      pressMatch &&
      !(parsed.data.player_ids && parsed.data.player_ids.length > 0)
    ) {
      addPlayerEntry(bet.id, pressMatch.player1_id);
      addPlayerEntry(bet.id, pressMatch.player2_id);
    }
    for (const pid of parsed.data.player_ids ?? []) addPlayerEntry(bet.id, pid);
    for (const tid of parsed.data.team_ids ?? []) addTeamEntry(bet.id, tid);
    return bet;
  });

  emitChange("rounds", slug);
  return NextResponse.json({ ok: true, id: result.id });
}
