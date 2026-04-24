import { createServerSupabase } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getCurrentPlayer } from "@/lib/server/currentPlayer";
import { MatchScorecard } from "./MatchScorecard";
import type {
  Day1MatchStateRow,
  HoleRow,
  HoleScoreRow,
  MatchRow,
  PlayerRow,
  RoundRow,
  TeamRow,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Day1MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const me = await getCurrentPlayer();

  const { data: match } = await supabase
    .from("matches")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!match) notFound();

  const m = match as MatchRow;

  const [{ data: round }, { data: holes }, { data: state }, { data: p1 }, { data: p2 }, { data: scores }] =
    await Promise.all([
      supabase.from("rounds").select("*").eq("id", m.round_id).single(),
      supabase
        .from("holes")
        .select("*")
        .eq("round_id", m.round_id)
        .order("hole_number"),
      supabase
        .from("v_day1_match_state")
        .select("*")
        .eq("match_id", id)
        .maybeSingle(),
      supabase.from("players").select("*, team:teams(*)").eq("id", m.player1_id).single(),
      supabase.from("players").select("*, team:teams(*)").eq("id", m.player2_id).single(),
      supabase
        .from("hole_scores")
        .select("*")
        .eq("round_id", m.round_id)
        .in("player_id", [m.player1_id, m.player2_id]),
    ]);

  return (
    <MatchScorecard
      match={m}
      round={round as RoundRow}
      holes={(holes ?? []) as HoleRow[]}
      state={(state ?? null) as Day1MatchStateRow | null}
      player1={p1 as PlayerRow & { team: TeamRow }}
      player2={p2 as PlayerRow & { team: TeamRow }}
      initialScores={(scores ?? []) as HoleScoreRow[]}
      myId={me?.id ?? null}
      isAdmin={me?.is_admin ?? false}
    />
  );
}
