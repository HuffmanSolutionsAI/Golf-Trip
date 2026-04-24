import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { reseedDay1StrokesIfUnlocked } from "@/lib/server/reseedDay1";

const Body = z.object({
  holeId: z.string().uuid(),
  par: z.number().int().min(3).max(5).optional(),
  handicap_index: z.number().int().min(1).max(18).nullable().optional(),
  yardage: z.number().int().min(1).max(800).nullable().optional(),
});

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const admin = createAdminSupabase();
  const payload: Record<string, unknown> = {};
  if (parsed.data.par !== undefined) payload.par = parsed.data.par;
  if (parsed.data.handicap_index !== undefined) payload.handicap_index = parsed.data.handicap_index;
  if (parsed.data.yardage !== undefined) payload.yardage = parsed.data.yardage;

  const { data: hole, error } = await admin
    .from("holes")
    .update(payload)
    .eq("id", parsed.data.holeId)
    .select("round_id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If this is a Day 1 hole, reseed stroke allocations.
  const { data: round } = await admin
    .from("rounds")
    .select("day")
    .eq("id", hole.round_id)
    .single();
  if (round?.day === 1) {
    await reseedDay1StrokesIfUnlocked(admin);
  }

  return NextResponse.json({ ok: true });
}
