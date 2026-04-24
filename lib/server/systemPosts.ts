// Server-side helpers for system chat auto-posts.
// Called from score-entry routes and admin lock/unlock.

import { createAdminSupabase } from "@/lib/supabase/server";
import type {
  Day1MatchStateRow,
  HoleRow,
  HoleScoreRow,
  LeaderboardRow,
  MatchRow,
  PlayerRow,
  RoundRow,
  TeamRow,
} from "@/lib/types";

type Admin = ReturnType<typeof createAdminSupabase>;

async function insertSystemMessageIfNew(admin: Admin, body: string) {
  // Dedupe by exact body match — crude but effective for this use case.
  const { data: existing } = await admin
    .from("chat_messages")
    .select("id")
    .eq("body", body)
    .eq("kind", "system")
    .limit(1);
  if (existing && existing.length > 0) return;
  await admin.from("chat_messages").insert({ body, kind: "system" });
}

export async function postIfMatchJustWentFinal(
  admin: Admin,
  matchId: string,
) {
  const { data: stateRow } = await admin
    .from("v_day1_match_state")
    .select("*")
    .eq("match_id", matchId)
    .maybeSingle();
  if (!stateRow) return;
  const s = stateRow as Day1MatchStateRow;
  if (s.status !== "final") return;

  const { data: p1 } = await admin
    .from("players")
    .select("name, team:teams(name)")
    .eq("id", s.player1_id)
    .single();
  const { data: p2 } = await admin
    .from("players")
    .select("name, team:teams(name)")
    .eq("id", s.player2_id)
    .single();

  if (!p1 || !p2) return;

  type JoinedPlayer = { name: string; team: { name: string } | { name: string }[] | null };
  const jp1 = p1 as unknown as JoinedPlayer;
  const jp2 = p2 as unknown as JoinedPlayer;
  const p1Name = jp1.name;
  const p2Name = jp2.name;
  const teamName = (t: JoinedPlayer["team"]): string =>
    Array.isArray(t) ? (t[0]?.name ?? "") : (t?.name ?? "");
  const p1Team = teamName(jp1.team);
  const p2Team = teamName(jp2.team);

  let body: string;
  if (s.winner_player_id === null) {
    body = `Match ${s.match_number} · ${p1Name} vs ${p2Name} halved · +1 each (${p1Team} / ${p2Team})`;
  } else {
    const winner = s.winner_player_id === s.player1_id ? p1Name : p2Name;
    const loser = s.winner_player_id === s.player1_id ? p2Name : p1Name;
    const winnerTeam = s.winner_player_id === s.player1_id ? p1Team : p2Team;
    const margin = Math.abs(s.p1_total_net - s.p2_total_net);
    body = `Match ${s.match_number} · ${winner} def. ${loser} by ${margin} net · +2 for ${winnerTeam}`;
  }
  await insertSystemMessageIfNew(admin, body);
}

export async function postIfLeaderChanged(admin: Admin) {
  const { data } = await admin
    .from("v_leaderboard")
    .select("*")
    .order("rank")
    .limit(1);
  if (!data || data.length === 0) return;
  const top = data[0] as LeaderboardRow;
  if (top.total_points === 0) return;
  const body = `🏆 ${top.name} takes the lead (${top.total_points} pts)`;
  await insertSystemMessageIfNew(admin, body);
}

export async function postIfEagleOrBetter(
  admin: Admin,
  score: HoleScoreRow,
  hole: HoleRow,
  player: PlayerRow | null,
  round: RoundRow,
) {
  if (!player) return; // scramble scores don't have per-player names

  if (score.strokes === 1 && hole.par === 3) {
    await insertSystemMessageIfNew(
      admin,
      `⛳ HOLE IN ONE · ${player.name} just aced hole ${hole.hole_number} at ${round.course_name}`,
    );
    return;
  }
  const isEagleOrBetter =
    (hole.par === 4 && score.strokes <= 2) ||
    (hole.par === 5 && score.strokes <= 3);
  if (isEagleOrBetter) {
    await insertSystemMessageIfNew(
      admin,
      `🦅 ${player.name} made ${score.strokes} on hole ${hole.hole_number} at ${round.course_name}`,
    );
  }
}

export async function postIfRoundLocked(admin: Admin, round: RoundRow) {
  if (!round.is_locked) return;
  const formatLabel = round.format === "singles" ? "Singles" : round.format === "scramble_2man" ? "2-man scramble" : "4-man scramble";
  await insertSystemMessageIfNew(
    admin,
    `🔒 Day ${round.day} · ${formatLabel} · Final`,
  );
}

export async function postTeeTimeAlertIfDue(admin: Admin) {
  const { data: rounds } = await admin.from("rounds").select("*");
  if (!rounds) return;
  const now = new Date();
  for (const r of rounds as RoundRow[]) {
    const start = new Date(r.date + "T" + r.tee_time);
    const minutesTo = (start.getTime() - now.getTime()) / 60000;
    if (minutesTo >= 25 && minutesTo <= 35) {
      await insertSystemMessageIfNew(
        admin,
        `⏰ Day ${r.day} tees off in 30 min · ${r.course_name}`,
      );
    }
  }
}

export async function loadMatchForPlayerOnRound(
  admin: Admin,
  roundId: string,
  playerId: string,
): Promise<MatchRow | null> {
  const { data } = await admin
    .from("matches")
    .select("*")
    .eq("round_id", roundId)
    .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
    .maybeSingle();
  return (data as MatchRow) ?? null;
}

export async function getTeamById(
  admin: Admin,
  id: string,
): Promise<TeamRow | null> {
  const { data } = await admin.from("teams").select("*").eq("id", id).maybeSingle();
  return (data as TeamRow) ?? null;
}
