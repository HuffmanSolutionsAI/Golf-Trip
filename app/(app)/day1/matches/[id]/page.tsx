import { notFound } from "next/navigation";
import { getCurrentPlayer } from "@/lib/session";
import {
  getMatch,
  listScoresForPlayerOnRound,
} from "@/lib/repo/scores";
import { getRound, listHoles } from "@/lib/repo/rounds";
import { getPlayerWithTeam, listPlayers } from "@/lib/repo/players";
import { computeDay1MatchStates } from "@/lib/repo/standings";
import {
  getTeeGroupForMatch,
  listMatchIdsForTeeGroup,
} from "@/lib/repo/teeGroups";
import { MatchScorecard, type MatchInfo } from "./MatchScorecard";
import type { HoleScoreRow } from "@/lib/types";

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

  const teeGroup = getTeeGroupForMatch(match.id);
  const matchIds = teeGroup
    ? listMatchIdsForTeeGroup(teeGroup.id)
    : [match.id];
  const orderedIds = [
    match.id,
    ...matchIds.filter((mid) => mid !== match.id),
  ];

  const states = new Map(
    computeDay1MatchStates().map((s) => [s.match_id, s]),
  );

  const matches: MatchInfo[] = orderedIds
    .map((mid) => {
      const m = getMatch(mid);
      if (!m) return null;
      const p1 = getPlayerWithTeam(m.player1_id);
      const p2 = getPlayerWithTeam(m.player2_id);
      if (!p1 || !p2) return null;
      return {
        match: m,
        state: states.get(m.id) ?? null,
        player1: p1,
        player2: p2,
      } satisfies MatchInfo;
    })
    .filter((x): x is MatchInfo => !!x);

  const allPlayerIds = matches.flatMap((mi) => [mi.player1.id, mi.player2.id]);
  const allScores: HoleScoreRow[] = allPlayerIds.flatMap((pid) =>
    listScoresForPlayerOnRound(pid, match.round_id),
  );

  const scorer = teeGroup?.scorer_player_id
    ? listPlayers().find((p) => p.id === teeGroup.scorer_player_id) ?? null
    : null;

  return (
    <MatchScorecard
      matches={matches}
      groupNumber={teeGroup?.group_number ?? null}
      scheduledTime={teeGroup?.scheduled_time ?? null}
      round={round}
      holes={holes}
      initialScores={allScores}
      myId={me?.id ?? null}
      isAdmin={!!me?.is_admin}
      scorerId={teeGroup?.scorer_player_id ?? null}
      scorerName={scorer?.name ?? null}
    />
  );
}
