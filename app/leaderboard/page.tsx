import { createServerSupabase } from "@/lib/supabase/server";
import { LeaderboardView } from "./LeaderboardView";
import type { LeaderboardRow, PlayerRow, TeamRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const supabase = await createServerSupabase();
  const [lbRes, playersRes] = await Promise.all([
    supabase.from("v_leaderboard").select("*").order("rank"),
    supabase.from("players").select("*"),
  ]);

  const rows = (lbRes.data ?? []) as LeaderboardRow[];
  const players = (playersRes.data ?? []) as PlayerRow[];

  const playersByTeam = new Map<string, PlayerRow[]>();
  players.forEach((p) => {
    if (!playersByTeam.has(p.team_id)) playersByTeam.set(p.team_id, []);
    playersByTeam.get(p.team_id)!.push(p);
  });
  for (const list of playersByTeam.values()) {
    list.sort((a, b) => a.team_slot.localeCompare(b.team_slot));
  }

  return <LeaderboardView rows={rows} playersByTeam={Object.fromEntries(playersByTeam)} />;
}
