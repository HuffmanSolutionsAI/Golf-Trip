import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase/server";

const Body = z.object({
  playerId: z.string().uuid(),
  passcode: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (parsed.data.passcode !== process.env.TRIP_PASSCODE) {
    return NextResponse.json({ error: "Incorrect passcode." }, { status: 403 });
  }

  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Admin-privileged update: link the player row, set is_admin if commissioner.
  const admin = createAdminSupabase();

  const { data: targetPlayer, error: readErr } = await admin
    .from("players")
    .select("id, user_id")
    .eq("id", parsed.data.playerId)
    .maybeSingle();

  if (readErr || !targetPlayer) {
    return NextResponse.json({ error: "Player not found." }, { status: 404 });
  }

  if (targetPlayer.user_id && targetPlayer.user_id !== auth.user.id) {
    return NextResponse.json(
      { error: "That slot is already claimed." },
      { status: 409 },
    );
  }

  // Guard: does this auth user already have a different player row?
  const { data: existing } = await admin
    .from("players")
    .select("id")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (existing && existing.id !== parsed.data.playerId) {
    return NextResponse.json(
      { error: "You've already claimed a different slot." },
      { status: 409 },
    );
  }

  const commissionerEmail = process.env.COMMISSIONER_EMAIL?.toLowerCase();
  const isCommissioner =
    !!commissionerEmail && auth.user.email?.toLowerCase() === commissionerEmail;

  const { data: updated, error: updErr } = await admin
    .from("players")
    .update({
      user_id: auth.user.id,
      is_admin: isCommissioner ? true : undefined,
    })
    .eq("id", parsed.data.playerId)
    .select("*")
    .single();

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ player: updated });
}
