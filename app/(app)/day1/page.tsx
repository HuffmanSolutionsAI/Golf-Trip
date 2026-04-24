import { createServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardContent, CardEyebrow } from "@/components/ui/card";
import type { Day1MatchStateRow, MatchRow, PlayerRow, TeamRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Day1IndexPage() {
  const supabase = await createServerSupabase();
  const [matchesRes, stateRes, playersRes, teamsRes] = await Promise.all([
    supabase.from("matches").select("*").order("match_number"),
    supabase.from("v_day1_match_state").select("*"),
    supabase.from("players").select("*"),
    supabase.from("teams").select("*"),
  ]);

  const matches = (matchesRes.data ?? []) as MatchRow[];
  const states = (stateRes.data ?? []) as Day1MatchStateRow[];
  const players = new Map((playersRes.data ?? []).map((p: PlayerRow) => [p.id, p]));
  const teams = new Map((teamsRes.data ?? []).map((t: TeamRow) => [t.id, t]));
  const stateById = new Map(states.map((s) => [s.match_id, s]));

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      <div>
        <div className="eyebrow">Day 1</div>
        <h1 className="font-display text-3xl text-[var(--color-navy)]">Singles · Ten matches</h1>
      </div>

      <div className="space-y-2">
        {matches.map((m) => {
          const state = stateById.get(m.id);
          const p1 = players.get(m.player1_id);
          const p2 = players.get(m.player2_id);
          const team1 = p1 ? teams.get(p1.team_id) : undefined;
          const team2 = p2 ? teams.get(p2.team_id) : undefined;
          return (
            <Link key={m.id} href={`/day1/matches/${m.id}`}>
              <Card className="hover:border-[var(--color-gold)] transition-colors">
                <CardContent className="flex items-center justify-between">
                  <div>
                    <CardEyebrow>Match {m.match_number}</CardEyebrow>
                    <div className="flex items-center gap-2 mt-0.5 text-sm font-ui">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: team1?.display_color }} />
                      <span>{p1?.name}</span>
                      <span className="text-neutral-500">vs</span>
                      <span>{p2?.name}</span>
                      <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: team2?.display_color }} />
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs tabular-nums text-neutral-600">
                    {state?.status === "final"
                      ? `Final · ${state.p1_total_net}–${state.p2_total_net}`
                      : state?.status === "in_progress"
                        ? `Thru ${state.holes_both_played}`
                        : "Pending"}
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
