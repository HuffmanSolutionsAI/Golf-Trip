import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentPlayer } from "@/lib/session";
import { getTeam, listPlayers, listPlayersByTeam } from "@/lib/repo/players";
import {
  computeDay1MatchStates,
  computeDay2PoolRankRows,
  computeDay3StandingRows,
} from "@/lib/repo/standings";
import { listScrambleEntries } from "@/lib/repo/scores";
import { Card, CardContent, CardEyebrow } from "@/components/ui/card";
import { TeamNameEditor } from "./TeamNameEditor";

export const dynamic = "force-dynamic";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const team = getTeam(id);
  if (!team) notFound();

  const me = await getCurrentPlayer();
  const canEditName =
    !!me && (!!me.is_admin || (me.team_id === id && me.team_slot === "A"));

  const players = listPlayersByTeam(id);
  const playerIds = new Set(players.map((p) => p.id));
  const day1 = computeDay1MatchStates().filter(
    (m) => playerIds.has(m.player1_id) || playerIds.has(m.player2_id),
  );
  const day2 = computeDay2PoolRankRows().filter((r) => r.team_id === id);
  const day3 = computeDay3StandingRows().filter((r) => r.team_id === id)[0] ?? null;
  const nameById = new Map(listPlayers().map((p) => [p.id, p.name]));

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div className="flex items-start gap-3">
        <span
          className="inline-block w-4 h-4 rounded-full mt-3 shrink-0"
          style={{ backgroundColor: team.display_color }}
        />
        <div className="min-w-0 flex-1">
          <div className="eyebrow">Team</div>
          <TeamNameEditor teamId={team.id} initialName={team.name} canEdit={canEditName} />
        </div>
      </div>

      <Card>
        <CardContent>
          <CardEyebrow>Roster</CardEyebrow>
          <ul className="mt-2 grid grid-cols-2 gap-3">
            {players.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/players/${p.id}`}
                  className="block hover:underline text-sm font-ui"
                >
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-neutral-500">
                    Slot {p.team_slot} · HCP {p.handicap}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <CardEyebrow>Day 1 · Singles</CardEyebrow>
          {day1.length === 0 ? (
            <p className="text-sm italic text-neutral-600 mt-2">No Day 1 matches yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-[var(--color-rule)]">
              {day1.map((m) => {
                const isP1 = playerIds.has(m.player1_id);
                const me = isP1 ? m.player1_id : m.player2_id;
                const opp = isP1 ? m.player2_id : m.player1_id;
                const myPts = isP1 ? m.p1_team_points : m.p2_team_points;
                const myNet = isP1 ? m.p1_total_net : m.p2_total_net;
                return (
                  <li key={m.match_id} className="py-2 flex justify-between text-sm">
                    <Link href={`/day1/matches/${m.match_id}`} className="hover:underline">
                      Match {m.match_number} · {nameById.get(me)} vs {nameById.get(opp)}
                    </Link>
                    <span className="font-mono tabular-nums">
                      {m.status === "final" ? `${myNet} · ${myPts} pt` : m.status}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <CardEyebrow>Day 2 · Scramble pools</CardEyebrow>
          {day2.length === 0 ? (
            <p className="text-sm italic text-neutral-600 mt-2">No Day 2 entries yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-[var(--color-rule)]">
              {day2.map((r) => (
                <li key={r.entry_id} className="py-2 flex justify-between text-sm">
                  <Link
                    href={`/day2/entries/${r.entry_id}`}
                    className="hover:underline"
                  >
                    Pool {r.pool}
                  </Link>
                  <span className="font-mono tabular-nums">
                    {r.holes_thru === 18 ? `raw ${r.team_raw}` : `thru ${r.holes_thru}`} ·
                    rank {r.rank_in_pool} · {r.points} pt
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <CardEyebrow>Day 3 · Team scramble</CardEyebrow>
          {!day3 ? (
            <p className="text-sm italic text-neutral-600 mt-2">No Day 3 entry yet.</p>
          ) : (
            <Link
              href={`/day3/entries/${day3.entry_id}`}
              className="flex items-center justify-between text-sm mt-2 hover:underline"
            >
              <span>
                Raw {day3.team_raw} · thru {day3.holes_thru} · par {day3.par_thru}
              </span>
              <span className="font-mono tabular-nums">
                rank {day3.rank} · {day3.total_points} pt
              </span>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
