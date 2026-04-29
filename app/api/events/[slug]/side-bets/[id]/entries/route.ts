import { NextResponse } from "next/server";
import { z } from "zod";
import { checkCommissioner } from "@/lib/auth/eventPermissions";
import { runWithEvent } from "@/lib/repo/events";
import {
  addPlayerEntry,
  addTeamEntry,
  getSideBet,
  removePlayerEntry,
  removeTeamEntry,
} from "@/lib/repo/sideBets";
import { getDb } from "@/lib/db";
import { emitChange } from "@/lib/events";

export const runtime = "nodejs";

// Add a participant to a side bet. (Plan A · Phase 4a)
// Body must specify exactly one of player_id / team_id.
const PostBody = z
  .object({
    player_id: z.string().min(1).optional(),
    team_id: z.string().min(1).optional(),
  })
  .refine(
    (v) => (v.player_id ? 1 : 0) + (v.team_id ? 1 : 0) === 1,
    { message: "Specify exactly one of player_id or team_id." },
  );

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
  if (!bet) return NextResponse.json({ error: "Unknown bet." }, { status: 404 });
  if (bet.status === "settled") {
    return NextResponse.json(
      { error: "Settled bets are read-only." },
      { status: 409 },
    );
  }

  const db = getDb();
  if (parsed.data.player_id) {
    const ok = db
      .prepare(`SELECT 1 FROM players WHERE id = ? AND event_id = ?`)
      .get(parsed.data.player_id, slug);
    if (!ok) {
      return NextResponse.json({ error: "Unknown player." }, { status: 400 });
    }
    try {
      runWithEvent(slug, () => addPlayerEntry(id, parsed.data.player_id!));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("UNIQUE")) {
        return NextResponse.json(
          { error: "Player already in this bet." },
          { status: 409 },
        );
      }
      throw err;
    }
  } else if (parsed.data.team_id) {
    const ok = db
      .prepare(`SELECT 1 FROM teams WHERE id = ? AND event_id = ?`)
      .get(parsed.data.team_id, slug);
    if (!ok) {
      return NextResponse.json({ error: "Unknown team." }, { status: 400 });
    }
    try {
      runWithEvent(slug, () => addTeamEntry(id, parsed.data.team_id!));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("UNIQUE")) {
        return NextResponse.json(
          { error: "Team already in this bet." },
          { status: 409 },
        );
      }
      throw err;
    }
  }

  emitChange("rounds", slug);
  return NextResponse.json({ ok: true });
}

// Remove a participant. Body specifies which one. (Plan A · Phase 4a)
const DeleteBody = z
  .object({
    player_id: z.string().min(1).optional(),
    team_id: z.string().min(1).optional(),
  })
  .refine(
    (v) => (v.player_id ? 1 : 0) + (v.team_id ? 1 : 0) === 1,
    { message: "Specify exactly one of player_id or team_id." },
  );

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
  if (!bet) return NextResponse.json({ error: "Unknown bet." }, { status: 404 });
  if (bet.status === "settled") {
    return NextResponse.json(
      { error: "Settled bets are read-only." },
      { status: 409 },
    );
  }

  const removed = runWithEvent(slug, () => {
    if (parsed.data.player_id) return removePlayerEntry(id, parsed.data.player_id);
    if (parsed.data.team_id) return removeTeamEntry(id, parsed.data.team_id);
    return false;
  });
  if (!removed) {
    return NextResponse.json(
      { error: "That participant isn't in this bet." },
      { status: 404 },
    );
  }

  emitChange("rounds", slug);
  return NextResponse.json({ ok: true });
}
