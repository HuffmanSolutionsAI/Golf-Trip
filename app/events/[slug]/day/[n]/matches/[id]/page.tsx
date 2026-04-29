import { notFound } from "next/navigation";
import { getCurrentPlayer } from "@/lib/session";
import { getEventById, runWithEvent } from "@/lib/repo/events";
import {
  getMatch,
  listScoresForPlayerOnRound,
} from "@/lib/repo/scores";
import { getRound, listHoles } from "@/lib/repo/rounds";
import { getPlayerWithTeam, listPlayers } from "@/lib/repo/players";
import { getDay1MatchState } from "@/lib/repo/standings";
import { getTeeGroupForMatch } from "@/lib/repo/teeGroups";
import { MatchScorecard } from "@/app/(app)/day1/matches/[id]/MatchScorecard";

export const dynamic = "force-dynamic";

export default async function EventMatchPage({
  params,
}: {
  params: Promise<{ slug: string; n: string; id: string }>;
}) {
  const { slug, id } = await params;
  if (!getEventById(slug)) notFound();
  const me = await getCurrentPlayer();

  const data = runWithEvent(slug, () => {
    const match = getMatch(id);
    if (!match) return null;
    const round = getRound(match.round_id);
    if (!round || round.format !== "singles") return null;
    const holes = listHoles(match.round_id);
    const state = getDay1MatchState(id);
    const p1 = getPlayerWithTeam(match.player1_id);
    const p2 = getPlayerWithTeam(match.player2_id);
    if (!p1 || !p2) return null;
    const scores = [
      ...listScoresForPlayerOnRound(match.player1_id, match.round_id),
      ...listScoresForPlayerOnRound(match.player2_id, match.round_id),
    ];
    const teeGroup = getTeeGroupForMatch(match.id);
    const scorer = teeGroup?.scorer_player_id
      ? listPlayers().find((p) => p.id === teeGroup.scorer_player_id) ?? null
      : null;
    return { match, round, holes, state, p1, p2, scores, teeGroup, scorer };
  });
  if (!data) notFound();

  return (
    <MatchScorecard
      match={data.match}
      round={data.round}
      holes={data.holes}
      state={data.state}
      player1={data.p1}
      player2={data.p2}
      initialScores={data.scores}
      myId={me?.id ?? null}
      isAdmin={!!me?.is_admin}
      scorerId={data.teeGroup?.scorer_player_id ?? null}
      scorerName={data.scorer?.name ?? null}
      eventId={slug}
    />
  );
}
