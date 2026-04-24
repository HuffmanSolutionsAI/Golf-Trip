import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";

const Body = z.object({
  body: z.string().trim().min(1).max(1000),
});

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  const { error } = await supabase.from("chat_messages").insert({
    user_id: auth.user.id,
    player_id: player?.id ?? null,
    body: parsed.data.body,
    kind: "human",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
