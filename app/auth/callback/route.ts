// Magic-link callback. Exchanges the ?code param for a session cookie,
// then redirects to /home (or /claim if not yet linked to a player).

import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=missing_code`);
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(error.message)}`);
  }

  // Decide redirect: claimed -> next, else -> /claim
  const { data: auth } = await supabase.auth.getUser();
  if (auth.user) {
    const { data: player } = await supabase
      .from("players")
      .select("id")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (!player) {
      return NextResponse.redirect(`${origin}/claim`);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
