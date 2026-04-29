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

  const rulesJson =
    parsed.data.type === "skins"
      ? JSON.stringify({
          score_type: parsed.data.rules?.score_type ?? "gross",
        })
      : parsed.data.rules
        ? JSON.stringify(parsed.data.rules)
        : null;

  const result = runWithEvent(slug, () => {
    const bet = createSideBet(slug, {
      type: parsed.data.type,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      buy_in_cents: parsed.data.buy_in_cents,
      round_id: parsed.data.round_id ?? null,
      rules_json: rulesJson,
    });
    for (const pid of parsed.data.player_ids ?? []) addPlayerEntry(bet.id, pid);
    for (const tid of parsed.data.team_ids ?? []) addTeamEntry(bet.id, tid);
    return bet;
  });

  emitChange("rounds", slug);
  return NextResponse.json({ ok: true, id: result.id });
}
