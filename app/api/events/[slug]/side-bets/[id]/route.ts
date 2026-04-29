import { NextResponse } from "next/server";
import { z } from "zod";
import { checkCommissioner } from "@/lib/auth/eventPermissions";
import { runWithEvent } from "@/lib/repo/events";
import {
  deleteSideBet,
  getSideBet,
  updateSideBet,
} from "@/lib/repo/sideBets";
import { getDb } from "@/lib/db";
import { emitChange } from "@/lib/events";

export const runtime = "nodejs";

// Edit a side bet's display fields. Refuses if the bet is settled —
// settled bets are immutable. (Plan A · Phase 4a)
const PatchBody = z
  .object({
    name: z.string().min(1).max(80).optional(),
    description: z.string().max(400).nullable().optional(),
    buy_in_cents: z.number().int().min(0).max(1_000_000).optional(),
    round_id: z.string().min(1).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Nothing to update.",
  });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const guard = await checkCommissioner(slug);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
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

  if (parsed.data.round_id) {
    const ok = getDb()
      .prepare(`SELECT 1 FROM rounds WHERE id = ? AND event_id = ?`)
      .get(parsed.data.round_id, slug);
    if (!ok) {
      return NextResponse.json({ error: "Unknown round." }, { status: 400 });
    }
  }

  runWithEvent(slug, () => updateSideBet(id, parsed.data));
  emitChange("rounds", slug);
  return NextResponse.json({ ok: true });
}

// Delete a side bet. Allowed even if settled — commissioner has the
// final word on the ledger. Cascades entries + payouts via FK ON DELETE
// CASCADE. (Plan A · Phase 4a)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const guard = await checkCommissioner(slug);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const bet = runWithEvent(slug, () => getSideBet(id));
  if (!bet) {
    return NextResponse.json({ error: "Unknown bet." }, { status: 404 });
  }

  runWithEvent(slug, () => deleteSideBet(id));
  emitChange("rounds", slug);
  return NextResponse.json({ ok: true });
}
