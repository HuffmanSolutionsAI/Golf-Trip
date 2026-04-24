import { createServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardContent, CardEyebrow } from "@/components/ui/card";
import type {
  Day3StandingsRow,
  PlayerRow,
  ScrambleEntryRow,
  ScrambleParticipantRow,
  TeamRow,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Day3IndexPage() {
  const supabase = await createServerSupabase();
  const { data: round } = await supabase.from("rounds").select("*").eq("day", 3).single();

  const [entriesRes, standingsRes, partRes, teamsRes, playersRes] = await Promise.all([
    supabase.from("scramble_entries").select("*").eq("round_id", round.id),
    supabase.from("v_day3_standings").select("*"),
    supabase.from("scramble_participants").select("*"),
    supabase.from("teams").select("*"),
    supabase.from("players").select("*"),
  ]);

  const entries = (entriesRes.data ?? []) as ScrambleEntryRow[];
  const standings = (standingsRes.data ?? []) as Day3StandingsRow[];
  const parts = (partRes.data ?? []) as ScrambleParticipantRow[];
  const teams = new Map((teamsRes.data ?? []).map((t: TeamRow) => [t.id, t]));
  const players = new Map((playersRes.data ?? []).map((p: PlayerRow) => [p.id, p]));
  const partsByEntry = new Map<string, string[]>();
  parts.forEach((p) => {
    if (!partsByEntry.has(p.scramble_entry_id)) partsByEntry.set(p.scramble_entry_id, []);
    partsByEntry.get(p.scramble_entry_id)!.push(p.player_id);
  });
  const standByEntry = new Map(standings.map((s) => [s.entry_id, s]));

  const sorted = [...entries].sort((a, b) => {
    const ra = standByEntry.get(a.id)?.rank ?? 99;
    const rb = standByEntry.get(b.id)?.rank ?? 99;
    return ra - rb;
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      <div>
        <div className="eyebrow">Day 3 · Hyland</div>
        <h1 className="font-display text-3xl text-[var(--color-navy)]">
          4-man team scramble
        </h1>
      </div>

      <div className="space-y-2">
        {sorted.map((e) => {
          const s = standByEntry.get(e.id);
          const team = teams.get(e.team_id);
          const names = (partsByEntry.get(e.id) ?? [])
            .map((id) => players.get(id)?.name)
            .filter(Boolean)
            .join(" / ");
          return (
            <Link key={e.id} href={`/day3/entries/${e.id}`}>
              <Card className="hover:border-[var(--color-gold)] transition-colors">
                <CardContent className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-lg w-6 text-center">{s?.rank ?? "—"}</span>
                    <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: team?.display_color }} />
                    <div>
                      <div className="font-ui font-semibold">{team?.name}</div>
                      <div className="text-xs font-body-serif italic text-neutral-600">
                        {names}
                      </div>
                    </div>
                  </div>
                  <div className="font-mono tabular-nums text-sm text-right">
                    {s
                      ? `${s.team_raw} · thru ${s.holes_thru} · ${s.total_points} pt`
                      : "—"}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
