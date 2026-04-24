import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/server/requireAdmin";

const Body = z.union([
  z.object({
    scoreId: z.string().uuid(),
    strokes: z.number().int().min(1).max(15),
  }),
  z.object({
    playerId: z.string().uuid().optional(),
    scrambleEntryId: z.string().uuid().optional(),
    roundId: z.string().uuid(),
    holeNumber: z.number().int().min(1).max(18),
    strokes: z.number().int().min(1).max(15),
  }),
]);

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const admin = createAdminSupabase();

  if ("scoreId" in parsed.data) {
    const { error } = await admin
      .from("hole_scores")
      .update({
        strokes: parsed.data.strokes,
        entered_by: gate.userId,
        entered_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.scoreId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { playerId, scrambleEntryId, roundId, holeNumber, strokes } = parsed.data;
  if ((playerId ? 1 : 0) + (scrambleEntryId ? 1 : 0) !== 1) {
    return NextResponse.json(
      { error: "Exactly one of playerId or scrambleEntryId required." },
      { status: 400 },
    );
  }

  // Find existing.
  let existingQ = admin
    .from("hole_scores")
    .select("id")
    .eq("round_id", roundId)
    .eq("hole_number", holeNumber);
  if (playerId) existingQ = existingQ.eq("player_id", playerId);
  else if (scrambleEntryId) existingQ = existingQ.eq("scramble_entry_id", scrambleEntryId);
  const { data: existing } = await existingQ.maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("hole_scores")
      .update({ strokes, entered_by: gate.userId, entered_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await admin.from("hole_scores").insert({
      round_id: roundId,
      hole_number: holeNumber,
      strokes,
      player_id: playerId ?? null,
      scramble_entry_id: scrambleEntryId ?? null,
      entered_by: gate.userId,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
