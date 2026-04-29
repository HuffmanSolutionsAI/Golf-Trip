import { notFound } from "next/navigation";
import { getEventById, runWithEvent } from "@/lib/repo/events";
import { listPlayers } from "@/lib/repo/players";
import { listRounds } from "@/lib/repo/rounds";
import {
  computeDay1IndividualLeaderboard,
  computeDay2EntryLeaderboard,
  computeDay3EntryLeaderboard,
  computeLeaderboard,
} from "@/lib/repo/standings";
import { LeaderboardView } from "@/app/leaderboard/LeaderboardView";
import type { PlayerRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EventLeaderboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = getEventById(slug);
  if (!event) notFound();

  const data = runWithEvent(slug, () => ({
    overall: computeLeaderboard(),
    day1: computeDay1IndividualLeaderboard(),
    day2: computeDay2EntryLeaderboard(),
    day3: computeDay3EntryLeaderboard(),
    rounds: listRounds(),
    players: listPlayers(),
  }));

  const byTeam: Record<string, PlayerRow[]> = {};
  for (const p of data.players) {
    (byTeam[p.team_id] ??= []).push(p);
  }
  for (const list of Object.values(byTeam)) {
    list.sort((a, b) => a.team_slot.localeCompare(b.team_slot));
  }

  return (
    <LeaderboardView
      overall={data.overall}
      day1={data.day1}
      day2={data.day2}
      day3={data.day3}
      rounds={data.rounds}
      playersByTeam={byTeam}
      eventId={slug}
    />
  );
}
