import { NextResponse } from "next/server";
import { z } from "zod";
import { checkCommissioner } from "@/lib/auth/eventPermissions";
import { runWithEvent } from "@/lib/repo/events";
import { deleteLot, getSideBet, upsertLot } from "@/lib/repo/sideBets";
import { getDb } from "@/lib/db";
import { emitChange } from "@/lib/events";

export const runtime = "nodejs";

// Calcutta lots — manage the team-bidder-bid triples that make up an
// auction pool. Refused on non-calcutta bets and on settled bets.
// (Plan A · Phase 4d)

const PostBody = z.object({
  team_id: z.string().min(1),
  bidder_player_id: z.string().min(1),
  bid_cents: z.number().int().min(0).max(10_000_000),
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
  const parsed = PostBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const bet = runWithEvent(slug, () => getSideBet(id));
  if (!bet) {
    return NextResponse.json({ error: "Unknown bet." }, { status: 404 });
  }
  if (bet.type !== "calcutta") {
    return NextResponse.json(
      { error: "Lots are only used on calcutta bets." },
      { status: 400 },
    );
  }
  if (bet.status === "settled") {
    return NextResponse.json(
      { error: "Settled bets are read-only." },
      { status: 409 },
    );
  }

  const db = getDb();
  const teamOk = db
    .prepare(`SELECT 1 FROM teams WHERE id = ? AND event_id = ?`)
    .get(parsed.data.team_id, slug);
  if (!teamOk) {
    return NextResponse.json({ error: "Unknown team." }, { status: 400 });
  }
  const bidderOk = db
    .prepare(`SELECT 1 FROM players WHERE id = ? AND event_id = ?`)
    .get(parsed.data.bidder_player_id, slug);
  if (!bidderOk) {
    return NextResponse.json({ error: "Unknown bidder." }, { status: 400 });
  }

  runWithEvent(slug, () =>
    upsertLot({
      sideBetId: id,
      teamId: parsed.data.team_id,
      bidderPlayerId: parsed.data.bidder_player_id,
      bidCents: parsed.data.bid_cents,
    }),
  );

  emitChange("rounds", slug);
  return NextResponse.json({ ok: true });
}

const DeleteBody = z.object({
  team_id: z.string().min(1),
});

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const guard = await checkCommissioner(slug);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const parsed = DeleteBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }
  const bet = runWithEvent(slug, () => getSideBet(id));
  if (!bet) {
    return NextResponse.json({ error: "Unknown bet." }, { status: 404 });
  }
  if (bet.status === "settled") {
    return NextResponse.json(
      { error: "Settled bets are read-only." },
      { status: 409 },
    );
  }

  const removed = runWithEvent(slug, () =>
    deleteLot(id, parsed.data.team_id),
  );
  if (!removed) {
    return NextResponse.json(
      { error: "No lot for that team in this bet." },
      { status: 404 },
    );
  }

  emitChange("rounds", slug);
  return NextResponse.json({ ok: true });
}
