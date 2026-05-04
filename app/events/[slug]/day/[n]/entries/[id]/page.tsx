import { notFound } from "next/navigation";
import { getCurrentPlayer } from "@/lib/session";
import { getEventById, runWithEvent } from "@/lib/repo/events";
import {
  getScrambleEntry,
  listParticipantsForEntry,
  listScoresForScrambleEntry,
} from "@/lib/repo/scores";
import { getRound, listHoles } from "@/lib/repo/rounds";
import { getTeam, listPlayers, listTeams } from "@/lib/repo/players";
import { computeDay2PoolRankRows } from "@/lib/repo/standings";
import {
  getTeeGroupForEntry,
  listEntryIdsForTeeGroup,
} from "@/lib/repo/teeGroups";
import { ScrambleScorecard } from "@/components/scoring/ScrambleScorecard";
import {
  Day2GroupScorecard,
  type EntryInfo,
} from "@/components/scoring/Day2GroupScorecard";
import type { HoleScoreRow, TeamRow } from "@/lib/types";

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
    const primary = getScrambleEntry(id);
    if (!primary) return null;
    const round = getRound(primary.round_id);
    if (!round || round.format === "singles") return null;

    const holes = listHoles(primary.round_id);
    const allPlayers = listPlayers();
    const playersById = new Map(allPlayers.map((p) => [p.id, p]));
    const teams = listTeams();
    const teamsById: Record<string, TeamRow> = Object.fromEntries(
      teams.map((t) => [t.id, t]),
    );
    const teeGroup = getTeeGroupForEntry(id);
    const scorer = teeGroup?.scorer_player_id
      ? allPlayers.find((p) => p.id === teeGroup.scorer_player_id) ?? null
      : null;

    if (round.format === "scramble_2man") {
      const entryIds = teeGroup
        ? listEntryIdsForTeeGroup(teeGroup.id)
        : [primary.id];
      const orderedIds = [
        primary.id,
        ...entryIds.filter((eid) => eid !== primary.id),
      ];
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
      return {
        kind: "day2" as const,
        round,
        holes,
        entries,
        allScores,
        teeGroup,
        scorer,
        teamsById,
        poolRanks: computeDay2PoolRankRows(),
      };
    }

    // Day 3 — single-entry scorecard
    const team = getTeam(primary.team_id);
    if (!team) return null;
    const scores = listScoresForScrambleEntry(id);
    const parts = listParticipantsForEntry(id);
    const partPlayerIds = new Set(parts.map((p) => p.player_id));
    const partNames = allPlayers
      .filter((p) => partPlayerIds.has(p.id))
      .map((p) => p.name);
    return {
      kind: "day3" as const,
      entry: primary,
      round,
      team,
      holes,
      scores,
      partNames,
      teeGroup,
      scorer,
      allPlayers,
      teamsById,
    };
  });
  if (!data) notFound();

  const canEnter =
    !!me &&
    (!!me.is_admin ||
      (!!data.teeGroup?.scorer_player_id &&
        me.id === data.teeGroup.scorer_player_id));

  if (data.kind === "day2") {
    return (
      <Day2GroupScorecard
        entries={data.entries}
        groupNumber={data.teeGroup?.group_number ?? null}
        scheduledTime={data.teeGroup?.scheduled_time ?? null}
        round={data.round}
        holes={data.holes}
        initialScores={data.allScores}
        poolRanks={data.poolRanks}
        teamsById={data.teamsById}
        myId={me?.id ?? null}
        isAdmin={!!me?.is_admin}
        scorerId={data.teeGroup?.scorer_player_id ?? null}
        scorerName={data.scorer?.name ?? null}
        eventId={slug}
      />
    );
  }

  return (
    <ScrambleScorecard
      mode="day3"
      entryId={id}
      round={data.round}
      holes={data.holes}
      initialScores={data.scores}
      team={data.team}
      participantNames={data.partNames}
      pool={null}
      canEnter={canEnter}
      allPlayers={data.allPlayers}
      roundIsLocked={!!data.round.is_locked}
      scorerName={data.scorer?.name ?? null}
      teamsById={data.teamsById}
      eventId={slug}
    />
  );
}
