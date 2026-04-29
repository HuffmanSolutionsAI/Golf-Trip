import { notFound } from "next/navigation";
import { getCurrentPlayer } from "@/lib/session";
import { getEventById, runWithEvent } from "@/lib/repo/events";
import {
  getScrambleEntry,
  listParticipantsForEntry,
  listScoresForScrambleEntry,
} from "@/lib/repo/scores";
import { getRound, listHoles } from "@/lib/repo/rounds";
import { getTeam, listPlayers } from "@/lib/repo/players";
import { computeDay2PoolRankRows } from "@/lib/repo/standings";
import { getTeeGroupForEntry } from "@/lib/repo/teeGroups";
import { ScrambleScorecard } from "@/components/scoring/ScrambleScorecard";

export const dynamic = "force-dynamic";

export default async function EventEntryPage({
  params,
}: {
  params: Promise<{ slug: string; n: string; id: string }>;
}) {
  const { slug, id } = await params;
  if (!getEventById(slug)) notFound();
  const me = await getCurrentPlayer();

  const data = runWithEvent(slug, () => {
    const entry = getScrambleEntry(id);
    if (!entry) return null;
    const round = getRound(entry.round_id);
    if (!round || round.format === "singles") return null;
    const team = getTeam(entry.team_id);
    if (!team) return null;
    const holes = listHoles(entry.round_id);
    const scores = listScoresForScrambleEntry(id);
    const parts = listParticipantsForEntry(id);
    const allPlayers = listPlayers();
    const partPlayerIds = new Set(parts.map((p) => p.player_id));
    const partNames = allPlayers
      .filter((p) => partPlayerIds.has(p.id))
      .map((p) => p.name);
    const poolRanks = entry.pool
      ? computeDay2PoolRankRows().filter((r) => r.pool === entry.pool)
      : [];
    const teeGroup = getTeeGroupForEntry(id);
    const scorer = teeGroup?.scorer_player_id
      ? allPlayers.find((p) => p.id === teeGroup.scorer_player_id) ?? null
      : null;
    return {
      entry,
      round,
      team,
      holes,
      scores,
      partNames,
      poolRanks,
      teeGroup,
      scorer,
      allPlayers,
    };
  });
  if (!data) notFound();

  const canEnter =
    !!me &&
    (!!me.is_admin ||
      (!!data.teeGroup?.scorer_player_id &&
        me.id === data.teeGroup.scorer_player_id));

  return (
    <ScrambleScorecard
      mode={data.round.format === "scramble_2man" ? "day2" : "day3"}
      entryId={id}
      round={data.round}
      holes={data.holes}
      initialScores={data.scores}
      team={data.team}
      participantNames={data.partNames}
      pool={data.entry.pool}
      poolRanks={data.poolRanks}
      canEnter={canEnter}
      allPlayers={data.allPlayers}
      roundIsLocked={!!data.round.is_locked}
      scorerName={data.scorer?.name ?? null}
      eventId={slug}
    />
  );
}
