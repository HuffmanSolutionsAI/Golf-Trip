import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { reseedDay1StrokesIfUnlocked } from "@/lib/server/reseedDay1";

const Body = z.object({
  playerId: z.string().uuid(),
  handicap: z.number().min(0).max(54),
});

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const admin = createAdminSupabase();
  const { error } = await admin
    .from("players")
    .update({ handicap: parsed.data.handicap })
    .eq("id", parsed.data.playerId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await reseedDay1StrokesIfUnlocked(admin);
  return NextResponse.json({ ok: true });
}
