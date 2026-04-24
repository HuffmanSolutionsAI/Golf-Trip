import { createServerSupabase } from "@/lib/supabase/server";
import type { PlayerRow, TeamRow } from "@/lib/types";

export type CurrentPlayer = PlayerRow & { team: TeamRow };

export async function getCurrentPlayer(): Promise<CurrentPlayer | null> {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data } = await supabase
    .from("players")
    .select("*, team:teams(*)")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  return (data as CurrentPlayer | null) ?? null;
}
