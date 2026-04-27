import { notFound } from "next/navigation";
import { getCurrentPlayer } from "@/lib/session";
import {
  getScrambleEntry,
  listParticipantsForEntry,
  listScoresForScrambleEntry,
} from "@/lib/repo/scores";
import { getRound, listHoles } from "@/lib/repo/rounds";
import { getTeam, listPlayers } from "@/lib/repo/players";
import { ScrambleScorecard } from "@/components/scoring/ScrambleScorecard";

export const dynamic = "force-dynamic";

export default async function Day3EntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await getCurrentPlayer();
  const entry = getScrambleEntry(id);
  if (!entry) notFound();

  const round = getRound(entry.round_id)!;
  const team = getTeam(entry.team_id)!;
  const holes = listHoles(entry.round_id);
  const scores = listScoresForScrambleEntry(id);
  const parts = listParticipantsForEntry(id);
  const allPlayers = listPlayers();
  const partPlayerIds = new Set(parts.map((p) => p.player_id));
  const partNames = allPlayers.filter((p) => partPlayerIds.has(p.id)).map((p) => p.name);
  const canEnter = !!me && (!!me.is_admin || partPlayerIds.has(me.id));

  return (
    <ScrambleScorecard
      mode="day3"
      entryId={id}
      round={round}
      holes={holes}
      initialScores={scores}
      team={team}
      participantNames={partNames}
      canEnter={canEnter}
      allPlayers={allPlayers}
      roundIsLocked={!!round.is_locked}
    />
  );
}
