import { createServerSupabase } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardEyebrow } from "@/components/ui/card";
import type {
  Day1MatchStateRow,
  Day2PoolRankRow,
  Day3StandingsRow,
  PlayerRow,
  ScrambleEntryRow,
  ScrambleParticipantRow,
  TeamRow,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  const { data: playerData } = await supabase
    .from("players")
    .select("*, team:teams(*)")
    .eq("id", id)
    .maybeSingle();
  if (!playerData) notFound();
  const player = playerData as PlayerRow & { team: TeamRow };

  const [day1Res, partRes, allPlayersRes] = await Promise.all([
    supabase.from("v_day1_match_state").select("*"),
    supabase.from("scramble_participants").select("*").eq("player_id", id),
    supabase.from("players").select("id, name").order("name"),
  ]);

  const matches = ((day1Res.data ?? []) as Day1MatchStateRow[]).filter(
    (m) => m.player1_id === id || m.player2_id === id,
  );
  const participantRows = (partRes.data ?? []) as ScrambleParticipantRow[];
  const entryIds = participantRows.map((p) => p.scramble_entry_id);

  const [entriesRes, day2Res, day3Res] = await Promise.all([
    entryIds.length > 0
      ? supabase.from("scramble_entries").select("*").in("id", entryIds)
      : Promise.resolve({ data: [] as ScrambleEntryRow[] } as { data: ScrambleEntryRow[] }),
    entryIds.length > 0
      ? supabase.from("v_day2_pool_ranks").select("*").in("entry_id", entryIds)
      : Promise.resolve({ data: [] as Day2PoolRankRow[] } as { data: Day2PoolRankRow[] }),
    entryIds.length > 0
      ? supabase.from("v_day3_standings").select("*").in("entry_id", entryIds)
      : Promise.resolve({ data: [] as Day3StandingsRow[] } as { data: Day3StandingsRow[] }),
  ]);

  const entries = (entriesRes.data ?? []) as ScrambleEntryRow[];
  const day2 = ((day2Res.data ?? []) as Day2PoolRankRow[])[0] ?? null;
  const day3 = ((day3Res.data ?? []) as Day3StandingsRow[])[0] ?? null;
  const nameById = new Map((allPlayersRes.data ?? []).map((p) => [p.id, p.name]));

  const day2Entry = entries.find((e) => e.pool);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div>
        <div className="eyebrow">Player</div>
        <h1 className="font-display text-3xl text-[var(--color-navy)]">
          {player.name}
        </h1>
        <div className="flex items-center gap-2 text-sm font-ui mt-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: player.team.display_color }} />
          <Link href={`/teams/${player.team.id}`} className="hover:underline">{player.team.name}</Link>
          <span className="text-neutral-500">· HCP {player.handicap} · Slot {player.team_slot}</span>
        </div>
      </div>

      <Card>
        <CardContent>
          <CardEyebrow>Day 1 · Singles match</CardEyebrow>
          {matches.length === 0 ? (
            <p className="text-sm italic text-neutral-600 mt-2">No Day 1 match yet.</p>
          ) : (
            matches.map((m) => {
              const isP1 = m.player1_id === id;
              const oppId = isP1 ? m.player2_id : m.player1_id;
              const myGross = isP1 ? m.p1_total_gross : m.p2_total_gross;
              const myNet = isP1 ? m.p1_total_net : m.p2_total_net;
              const oppNet = isP1 ? m.p2_total_net : m.p1_total_net;
              return (
                <Link
                  href={`/day1/matches/${m.match_id}`}
                  key={m.match_id}
                  className="flex items-center justify-between text-sm mt-2 hover:underline"
                >
                  <span>
                    Match {m.match_number} vs {nameById.get(oppId) ?? "opponent"}
                  </span>
                  <span className="font-mono tabular-nums">
                    {m.status === "final"
                      ? `${myGross} (${myNet}) vs ${oppNet}`
                      : `${m.status} · thru ${m.holes_both_played}`}
                  </span>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <CardEyebrow>Day 2 · Scramble pair</CardEyebrow>
          {!day2 ? (
            <p className="text-sm italic text-neutral-600 mt-2">No Day 2 entry.</p>
          ) : (
            <Link
              href={`/day2/entries/${day2.entry_id}`}
              className="flex items-center justify-between text-sm mt-2 hover:underline"
            >
              <span>
                Pool {day2.pool} {day2Entry ? "" : ""}
              </span>
              <span className="font-mono tabular-nums">
                raw {day2.team_raw} · thru {day2.holes_thru} · rank {day2.rank_in_pool} · {day2.points} pt
              </span>
            </Link>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <CardEyebrow>Day 3 · Team scramble</CardEyebrow>
          {!day3 ? (
            <p className="text-sm italic text-neutral-600 mt-2">No Day 3 entry.</p>
          ) : (
            <Link
              href={`/day3/entries/${day3.entry_id}`}
              className="flex items-center justify-between text-sm mt-2 hover:underline"
            >
              <span>
                Raw {day3.team_raw} · par {day3.par_thru}
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
