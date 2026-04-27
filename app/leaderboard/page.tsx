import { createServerSupabase } from "@/lib/supabase/server";
import { LeaderboardView } from "./LeaderboardView";
import type {
  Day1PlayerLeaderboardRow,
  Day2EntryLeaderboardRow,
  Day3EntryLeaderboardRow,
  LeaderboardRow,
  PlayerRow,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const supabase = await createServerSupabase();
  const [overallRes, day1Res, day2Res, day3Res, playersRes] = await Promise.all([
    supabase.from("v_leaderboard").select("*").order("rank"),
    supabase.from("v_day1_player_leaderboard").select("*").order("rank"),
    supabase.from("v_day2_entry_leaderboard").select("*").order("rank"),
    supabase.from("v_day3_entry_leaderboard").select("*").order("rank"),
    supabase.from("players").select("*"),
  ]);

  const overall = (overallRes.data ?? []) as LeaderboardRow[];
  const day1 = (day1Res.data ?? []) as Day1PlayerLeaderboardRow[];
  const day2 = (day2Res.data ?? []) as Day2EntryLeaderboardRow[];
  const day3 = (day3Res.data ?? []) as Day3EntryLeaderboardRow[];
  const players = (playersRes.data ?? []) as PlayerRow[];

  const playersByTeam = new Map<string, PlayerRow[]>();
  players.forEach((p) => {
    if (!playersByTeam.has(p.team_id)) playersByTeam.set(p.team_id, []);
    playersByTeam.get(p.team_id)!.push(p);
  });
  for (const list of playersByTeam.values()) {
    list.sort((a, b) => a.team_slot.localeCompare(b.team_slot));
  }

  return (
    <LeaderboardView
      overall={overall}
      day1={day1}
      day2={day2}
      day3={day3}
      playersByTeam={Object.fromEntries(playersByTeam)}
    />
  );
}
