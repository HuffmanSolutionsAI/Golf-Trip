import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function requireAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not signed in." }, { status: 401 }),
    };
  }
  const { data: player } = await supabase
    .from("players")
    .select("is_admin")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!player?.is_admin) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Admin only." }, { status: 403 }),
    };
  }
  return { ok: true, userId: auth.user.id };
}
