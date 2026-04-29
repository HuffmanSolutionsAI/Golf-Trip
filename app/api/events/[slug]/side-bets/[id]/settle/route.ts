import { NextResponse } from "next/server";
import { z } from "zod";
import { checkCommissioner } from "@/lib/auth/eventPermissions";
import { runWithEvent } from "@/lib/repo/events";
import {
  getSideBet,
  listEntries,
  settleSideBet,
} from "@/lib/repo/sideBets";
import { getDb } from "@/lib/db";
import { emitChange } from "@/lib/events";

export const runtime = "nodejs";

// Settle a side bet by recording payouts. (Plan A · Phase 4a)
//
// We don't enforce that payouts sum to the pot — commissioners may want
// to add a tip line, hold money for a future bet, or split unequally
// for any number of reasons. The bet's pot is shown alongside the
// payout total in the UI for transparency, but the math is the
// commissioner's call.
//
// Each payout: exactly one of recipient_player_id / recipient_team_id.
const PayoutSchema = z
  .object({
    recipient_player_id: z.string().min(1).optional(),
    recipient_team_id: z.string().min(1).optional(),
    amount_cents: z.number().int().min(0).max(10_000_000),
    note: z.string().max(200).optional(),
  })
  .refine(
    (v) =>
      (v.recipient_player_id ? 1 : 0) + (v.recipient_team_id ? 1 : 0) === 1,
    { message: "Each payout needs exactly one recipient (player or team)." },
  );

const Body = z.object({
  payouts: z.array(PayoutSchema).min(1).max(100),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
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

  const bet = runWithEvent(slug, () => getSideBet(id));
  if (!bet) return NextResponse.json({ error: "Unknown bet." }, { status: 404 });
  if (bet.status === "settled") {
    return NextResponse.json(
      { error: "This bet is already settled. Delete and recreate to redo." },
      { status: 409 },
    );
  }

  const entries = runWithEvent(slug, () => listEntries(id));
  if (entries.length === 0) {
    return NextResponse.json(
      { error: "No participants — add at least one before settling." },
      { status: 400 },
    );
  }

  const db = getDb();
  // Recipients must be event-scoped; otherwise commissioner could pay
  // someone outside the event.
  for (const p of parsed.data.payouts) {
    if (p.recipient_player_id) {
      const ok = db
        .prepare(`SELECT 1 FROM players WHERE id = ? AND event_id = ?`)
        .get(p.recipient_player_id, slug);
      if (!ok) {
        return NextResponse.json(
          { error: `Player ${p.recipient_player_id} isn't in this event.` },
          { status: 400 },
        );
      }
    }
    if (p.recipient_team_id) {
      const ok = db
        .prepare(`SELECT 1 FROM teams WHERE id = ? AND event_id = ?`)
        .get(p.recipient_team_id, slug);
      if (!ok) {
        return NextResponse.json(
          { error: `Team ${p.recipient_team_id} isn't in this event.` },
          { status: 400 },
        );
      }
    }
  }

  runWithEvent(slug, () => settleSideBet(id, parsed.data.payouts));
  emitChange("rounds", slug);
  return NextResponse.json({ ok: true });
}
