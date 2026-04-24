import { createServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardContent, CardEyebrow } from "@/components/ui/card";
import type {
  Day2PoolRankRow,
  PlayerRow,
  ScrambleEntryRow,
  ScrambleParticipantRow,
  TeamRow,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Day2IndexPage() {
  const supabase = await createServerSupabase();
  const { data: round } = await supabase
    .from("rounds")
    .select("*")
    .eq("day", 2)
    .single();

  const [entriesRes, rankRes, partRes, teamsRes, playersRes] = await Promise.all([
    supabase.from("scramble_entries").select("*").eq("round_id", round.id),
    supabase.from("v_day2_pool_ranks").select("*"),
    supabase.from("scramble_participants").select("*"),
    supabase.from("teams").select("*"),
    supabase.from("players").select("*"),
  ]);

  const entries = (entriesRes.data ?? []) as ScrambleEntryRow[];
  const ranks = (rankRes.data ?? []) as Day2PoolRankRow[];
  const parts = (partRes.data ?? []) as ScrambleParticipantRow[];
  const teams = new Map((teamsRes.data ?? []).map((t: TeamRow) => [t.id, t]));
  const players = new Map((playersRes.data ?? []).map((p: PlayerRow) => [p.id, p]));
  const partsByEntry = new Map<string, string[]>();
  parts.forEach((p) => {
    if (!partsByEntry.has(p.scramble_entry_id)) partsByEntry.set(p.scramble_entry_id, []);
    partsByEntry.get(p.scramble_entry_id)!.push(p.player_id);
  });
  const rankByEntry = new Map(ranks.map((r) => [r.entry_id, r]));

  const pools: Record<"AD" | "BC", ScrambleEntryRow[]> = { AD: [], BC: [] };
  entries.forEach((e) => {
    if (e.pool === "AD" || e.pool === "BC") pools[e.pool].push(e);
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div>
        <div className="eyebrow">Day 2 · Talamore</div>
        <h1 className="font-display text-3xl text-[var(--color-navy)]">
          2-man scramble · two pools
        </h1>
      </div>

      {(["AD", "BC"] as const).map((pool) => (
        <div key={pool} className="space-y-2">
          <div className="eyebrow">Pool {pool}</div>
          {pools[pool]
            .map((e) => ({ e, r: rankByEntry.get(e.id) }))
            .sort((a, b) => (a.r?.rank_in_pool ?? 99) - (b.r?.rank_in_pool ?? 99))
            .map(({ e, r }) => {
              const team = teams.get(e.team_id);
              const names = (partsByEntry.get(e.id) ?? [])
                .map((id) => players.get(id)?.name)
                .filter(Boolean)
                .join(" & ");
              return (
                <Link key={e.id} href={`/day2/entries/${e.id}`}>
                  <Card className="hover:border-[var(--color-gold)] transition-colors">
                    <CardContent className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-lg w-6 text-center">
                          {r?.rank_in_pool ?? "—"}
                        </span>
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ backgroundColor: team?.display_color }}
                        />
                        <div>
                          <div className="font-ui font-semibold">{team?.name}</div>
                          <div className="text-xs font-body-serif italic text-neutral-600">
                            {names}
                          </div>
                        </div>
                      </div>
                      <div className="font-mono tabular-nums text-sm text-right">
                        {r
                          ? `${r.team_raw} · thru ${r.holes_thru} · ${r.points} pt`
                          : "—"}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
        </div>
      ))}
    </div>
  );
}
