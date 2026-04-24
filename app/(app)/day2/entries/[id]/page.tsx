import { createServerSupabase } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getCurrentPlayer } from "@/lib/server/currentPlayer";
import { ScrambleScorecard } from "@/components/scoring/ScrambleScorecard";
import type {
  HoleRow,
  HoleScoreRow,
  PlayerRow,
  RoundRow,
  ScrambleEntryRow,
  ScrambleParticipantRow,
  TeamRow,
  Day2PoolRankRow,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Day2EntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const me = await getCurrentPlayer();

  const { data: entry } = await supabase
    .from("scramble_entries")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!entry) notFound();

  const e = entry as ScrambleEntryRow;
  const [
    { data: round },
    { data: team },
    { data: holes },
    { data: scores },
    { data: parts },
    { data: players },
    { data: poolRanks },
  ] = await Promise.all([
    supabase.from("rounds").select("*").eq("id", e.round_id).single(),
    supabase.from("teams").select("*").eq("id", e.team_id).single(),
    supabase.from("holes").select("*").eq("round_id", e.round_id).order("hole_number"),
    supabase.from("hole_scores").select("*").eq("scramble_entry_id", id),
    supabase.from("scramble_participants").select("*").eq("scramble_entry_id", id),
    supabase.from("players").select("*"),
    supabase.from("v_day2_pool_ranks").select("*").eq("pool", e.pool!).eq("round_id", e.round_id),
  ]);

  const partPlayerIds = new Set(
    ((parts ?? []) as ScrambleParticipantRow[]).map((p) => p.player_id),
  );
  const canEnter = me?.is_admin || (me && partPlayerIds.has(me.id));
  const partNames = (players ?? [])
    .filter((p) => partPlayerIds.has(p.id))
    .map((p) => p.name);

  return (
    <ScrambleScorecard
      mode="day2"
      entryId={id}
      round={round as RoundRow}
      holes={(holes ?? []) as HoleRow[]}
      initialScores={(scores ?? []) as HoleScoreRow[]}
      team={team as TeamRow}
      participantNames={partNames}
      pool={e.pool ?? null}
      poolRanks={(poolRanks ?? []) as Day2PoolRankRow[]}
      canEnter={!!canEnter}
      allPlayers={(players ?? []) as PlayerRow[]}
      roundIsLocked={(round as RoundRow).is_locked}
    />
  );
}
