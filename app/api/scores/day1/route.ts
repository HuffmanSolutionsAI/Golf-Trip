import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase/server";
import {
  postIfEagleOrBetter,
  postIfLeaderChanged,
  postIfMatchJustWentFinal,
  postTeeTimeAlertIfDue,
} from "@/lib/server/systemPosts";
import type { HoleRow, PlayerRow, RoundRow } from "@/lib/types";

const Body = z.object({
  matchId: z.string().uuid(),
  playerId: z.string().uuid(),
  holeNumber: z.number().int().min(1).max(18),
  strokes: z.number().int().min(1).max(15),
});

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { matchId, playerId, holeNumber, strokes } = parsed.data;

  // Verify match, load round for round_id.
  const { data: match, error: mErr } = await supabase
    .from("matches")
    .select("id, round_id, player1_id, player2_id")
    .eq("id", matchId)
    .maybeSingle();
  if (mErr || !match) return NextResponse.json({ error: "Match not found." }, { status: 404 });
  if (playerId !== match.player1_id && playerId !== match.player2_id) {
    return NextResponse.json({ error: "Player not in match." }, { status: 400 });
  }

  // Upsert through RLS — caller must be the target player or admin.
  const { data: existing } = await supabase
    .from("hole_scores")
    .select("id")
    .eq("round_id", match.round_id)
    .eq("player_id", playerId)
    .eq("hole_number", holeNumber)
    .maybeSingle();

  let opErr: string | null = null;
  if (existing) {
    const { error } = await supabase
      .from("hole_scores")
      .update({ strokes, entered_by: auth.user.id, entered_at: new Date().toISOString() })
      .eq("id", existing.id);
    opErr = error?.message ?? null;
  } else {
    const { error } = await supabase.from("hole_scores").insert({
      round_id: match.round_id,
      player_id: playerId,
      hole_number: holeNumber,
      strokes,
      entered_by: auth.user.id,
    });
    opErr = error?.message ?? null;
  }
  if (opErr) return NextResponse.json({ error: opErr }, { status: 403 });

  // Side effects (service role so they always run).
  const admin = createAdminSupabase();
  const [{ data: hole }, { data: player }, { data: round }, { data: score }] =
    await Promise.all([
      admin
        .from("holes")
        .select("*")
        .eq("round_id", match.round_id)
        .eq("hole_number", holeNumber)
        .maybeSingle(),
      admin.from("players").select("*").eq("id", playerId).maybeSingle(),
      admin.from("rounds").select("*").eq("id", match.round_id).maybeSingle(),
      admin
        .from("hole_scores")
        .select("*")
        .eq("round_id", match.round_id)
        .eq("player_id", playerId)
        .eq("hole_number", holeNumber)
        .maybeSingle(),
    ]);
  if (hole && player && round && score) {
    await postIfEagleOrBetter(admin, score, hole as HoleRow, player as PlayerRow, round as RoundRow);
  }
  await postIfMatchJustWentFinal(admin, matchId);
  await postIfLeaderChanged(admin);
  await postTeeTimeAlertIfDue(admin);

  return NextResponse.json({ ok: true });
}
