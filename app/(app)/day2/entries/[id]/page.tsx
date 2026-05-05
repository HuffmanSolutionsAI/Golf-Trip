import { notFound } from "next/navigation";
import { getCurrentPlayer } from "@/lib/session";
import {
  getScrambleEntry,
  listParticipantsForEntry,
  listScoresForScrambleEntry,
} from "@/lib/repo/scores";
import { getRound, listHoles } from "@/lib/repo/rounds";
import { listPlayers, listTeams } from "@/lib/repo/players";
import {
  computeDay2H2HRows,
  computeDay2PoolRankRows,
} from "@/lib/repo/standings";
import {
  getTeeGroupForEntry,
  listEntryIdsForTeeGroup,
} from "@/lib/repo/teeGroups";
import {
  Day2GroupScorecard,
  type EntryInfo,
} from "@/components/scoring/Day2GroupScorecard";
import type { HoleScoreRow, TeamRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Day2EntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await getCurrentPlayer();
  const primary = getScrambleEntry(id);
  if (!primary) notFound();

  const round = getRound(primary.round_id);
  if (!round) notFound();

  const holes = listHoles(primary.round_id);
  const allPlayers = listPlayers();
  const playersById = new Map(allPlayers.map((p) => [p.id, p]));
  const teams = listTeams();
  const teamsById: Record<string, TeamRow> = Object.fromEntries(
    teams.map((t) => [t.id, t]),
  );

  const teeGroup = getTeeGroupForEntry(id);
  const entryIds = teeGroup
    ? listEntryIdsForTeeGroup(teeGroup.id)
    : [primary.id];
  const orderedIds = [primary.id, ...entryIds.filter((eid) => eid !== primary.id)];

  const entries: EntryInfo[] = orderedIds
    .map((eid): EntryInfo | null => {
      const e = getScrambleEntry(eid);
      if (!e) return null;
      const team = teamsById[e.team_id];
      if (!team) return null;
      const partIds = listParticipantsForEntry(e.id).map((p) => p.player_id);
      const partNames = partIds
        .map((pid) => playersById.get(pid)?.name)
        .filter((n): n is string => !!n);
      return { entry: e, team, participantNames: partNames };
    })
    .filter((x): x is EntryInfo => !!x);

  const allScores: HoleScoreRow[] = entries.flatMap((info) =>
    listScoresForScrambleEntry(info.entry.id),
  );

  const poolRanks = computeDay2PoolRankRows();
  const h2h = teeGroup
    ? computeDay2H2HRows().find((r) => r.group_id === teeGroup.id) ?? null
    : null;

  const scorer = teeGroup?.scorer_player_id
    ? allPlayers.find((p) => p.id === teeGroup.scorer_player_id) ?? null
    : null;

  return (
    <Day2GroupScorecard
      entries={entries}
      groupNumber={teeGroup?.group_number ?? null}
      scheduledTime={teeGroup?.scheduled_time ?? null}
      round={round}
      holes={holes}
      initialScores={allScores}
      poolRanks={poolRanks}
      h2h={h2h}
      teamsById={teamsById}
      myId={me?.id ?? null}
      isAdmin={!!me?.is_admin}
      scorerId={teeGroup?.scorer_player_id ?? null}
      scorerName={scorer?.name ?? null}
    />
  );
}
