import { createServerSupabase } from "@/lib/supabase/server";
import { Card, CardContent, CardEyebrow } from "@/components/ui/card";
import Link from "next/link";
import { notFound } from "next/navigation";
import type {
  Day1MatchStateRow,
  Day2PoolRankRow,
  Day3StandingsRow,
  PlayerRow,
  ScrambleEntryRow,
  TeamRow,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  const [teamRes, playersRes, day1Res, day2Res, day3Res, entriesRes] = await Promise.all([
    supabase.from("teams").select("*").eq("id", id).single(),
    supabase.from("players").select("*").eq("team_id", id).order("team_slot"),
    supabase.from("v_day1_match_state").select("*"),
    supabase.from("v_day2_pool_ranks").select("*").eq("team_id", id),
    supabase.from("v_day3_standings").select("*").eq("team_id", id),
    supabase.from("scramble_entries").select("*").eq("team_id", id),
  ]);

  if (teamRes.error || !teamRes.data) notFound();

  const team = teamRes.data as TeamRow;
  const players = (playersRes.data ?? []) as PlayerRow[];
  const playerIds = new Set(players.map((p) => p.id));
  const day1Matches = ((day1Res.data ?? []) as Day1MatchStateRow[]).filter(
    (m) => playerIds.has(m.player1_id) || playerIds.has(m.player2_id),
  );
  const day2Ranks = (day2Res.data ?? []) as Day2PoolRankRow[];
  const day3 = ((day3Res.data ?? []) as Day3StandingsRow[])[0];
  const entries = (entriesRes.data ?? []) as ScrambleEntryRow[];
  const entryMap = new Map(entries.map((e) => [e.id, e]));
  const entryByPool = new Map(entries.filter((e) => e.pool).map((e) => [e.pool, e]));

  const playersById = new Map(players.map((p) => [p.id, p]));

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <span
          className="inline-block w-4 h-4 rounded-full"
          style={{ backgroundColor: team.display_color }}
        />
        <div>
          <div className="eyebrow">Team</div>
          <h1 className="font-display text-3xl text-[var(--color-navy)]">{team.name}</h1>
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
                  <div className="text-xs text-neutral-500">Slot {p.team_slot} · HCP {p.handicap}</div>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <CardEyebrow>Day 1 · Singles</CardEyebrow>
          {day1Matches.length === 0 ? (
            <p className="text-sm italic text-neutral-600 mt-2">No Day 1 matches yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-[var(--color-rule)]">
              {day1Matches.map((m) => {
                const isP1 = playerIds.has(m.player1_id);
                const me = playersById.get(isP1 ? m.player1_id : m.player2_id);
                const opp = isP1 ? m.player2_id : m.player1_id;
                const myPts = isP1 ? m.p1_team_points : m.p2_team_points;
                const myNet = isP1 ? m.p1_total_net : m.p2_total_net;
                return (
                  <li key={m.match_id} className="py-2 flex justify-between text-sm">
                    <Link href={`/day1/matches/${m.match_id}`} className="hover:underline">
                      Match {m.match_number} · {me?.name} vs opp {shortId(opp)}
                    </Link>
                    <span className="font-mono tabular-nums">
                      {m.status === "final" ? `${myNet ?? ""} · ${myPts} pt` : m.status}
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
          {day2Ranks.length === 0 ? (
            <p className="text-sm italic text-neutral-600 mt-2">No Day 2 entries yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-[var(--color-rule)]">
              {day2Ranks.map((r) => {
                const e = entryMap.get(r.entry_id) ?? entryByPool.get(r.pool);
                return (
                  <li key={r.entry_id} className="py-2 flex justify-between text-sm">
                    <Link
                      href={`/day2/entries/${r.entry_id}`}
                      className="hover:underline"
                    >
                      Pool {r.pool} {e ? `· entry` : ""}
                    </Link>
                    <span className="font-mono tabular-nums">
                      {r.holes_thru === 18 ? `raw ${r.team_raw}` : `thru ${r.holes_thru}`} · rank {r.rank_in_pool} · {r.points} pt
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

function shortId(id: string): string {
  return id.slice(0, 8);
}
