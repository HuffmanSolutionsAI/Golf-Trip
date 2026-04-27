import { notFound } from "next/navigation";
import { getCurrentPlayer } from "@/lib/session";
import {
  getMatch,
  listScoresForPlayerOnRound,
} from "@/lib/repo/scores";
import { getRound, listHoles } from "@/lib/repo/rounds";
import { getPlayerWithTeam } from "@/lib/repo/players";
import { getDay1MatchState } from "@/lib/repo/standings";
import { MatchScorecard } from "./MatchScorecard";

export const dynamic = "force-dynamic";

export default async function Day1MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await getCurrentPlayer();
  const match = getMatch(id);
  if (!match) notFound();

  const round = getRound(match.round_id);
  if (!round) notFound();
  const holes = listHoles(match.round_id);
  const state = getDay1MatchState(id);
  const p1 = getPlayerWithTeam(match.player1_id)!;
  const p2 = getPlayerWithTeam(match.player2_id)!;
  const scores = [
    ...listScoresForPlayerOnRound(match.player1_id, match.round_id),
    ...listScoresForPlayerOnRound(match.player2_id, match.round_id),
  ];

  return (
    <MatchScorecard
      match={match}
      round={round}
      holes={holes}
      state={state}
      player1={p1}
      player2={p2}
      initialScores={scores}
      myId={me?.id ?? null}
      isAdmin={!!me?.is_admin}
    />
  );
}
