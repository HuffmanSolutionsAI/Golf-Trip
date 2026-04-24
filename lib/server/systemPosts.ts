import "server-only";
import { getDb } from "@/lib/db";
import { insertSystemMessageIfNew } from "@/lib/repo/chat";
import { getDay1MatchState } from "@/lib/repo/standings";
import { computeLeaderboard } from "@/lib/repo/standings";
import type { HoleRow, PlayerRow, RoundRow } from "@/lib/types";

export function postIfMatchJustWentFinal(matchId: string) {
  const state = getDay1MatchState(matchId);
  if (!state || state.status !== "final") return;
  const db = getDb();
  const p1 = db.prepare("SELECT * FROM players WHERE id = ?").get(state.player1_id) as PlayerRow | undefined;
  const p2 = db.prepare("SELECT * FROM players WHERE id = ?").get(state.player2_id) as PlayerRow | undefined;
  if (!p1 || !p2) return;
  const t1 = db.prepare("SELECT name FROM teams WHERE id = ?").get(p1.team_id) as { name: string } | undefined;
  const t2 = db.prepare("SELECT name FROM teams WHERE id = ?").get(p2.team_id) as { name: string } | undefined;

  let body: string;
  if (state.winner_player_id === null) {
    body = `Match ${state.match_number} · ${p1.name} vs ${p2.name} halved · +1 each (${t1?.name ?? ""} / ${t2?.name ?? ""})`;
  } else {
    const winner = state.winner_player_id === state.player1_id ? p1 : p2;
    const loser = state.winner_player_id === state.player1_id ? p2 : p1;
    const winnerTeam = state.winner_player_id === state.player1_id ? t1?.name ?? "" : t2?.name ?? "";
    const margin = Math.abs(state.p1_total_net - state.p2_total_net);
    body = `Match ${state.match_number} · ${winner.name} def. ${loser.name} by ${margin} net · +2 for ${winnerTeam}`;
  }
  insertSystemMessageIfNew(body);
}

export function postIfLeaderChanged() {
  const rows = computeLeaderboard();
  if (rows.length === 0) return;
  const top = rows[0];
  if (top.total_points === 0) return;
  insertSystemMessageIfNew(`🏆 ${top.name} takes the lead (${top.total_points} pts)`);
}

export function postIfEagleOrBetter(strokes: number, hole: HoleRow, player: PlayerRow | null, round: RoundRow) {
  if (!player) return;
  if (strokes === 1 && hole.par === 3) {
    insertSystemMessageIfNew(
      `⛳ HOLE IN ONE · ${player.name} just aced hole ${hole.hole_number} at ${round.course_name}`,
    );
    return;
  }
  const isEagleOrBetter = (hole.par === 4 && strokes <= 2) || (hole.par === 5 && strokes <= 3);
  if (isEagleOrBetter) {
    insertSystemMessageIfNew(
      `🦅 ${player.name} made ${strokes} on hole ${hole.hole_number} at ${round.course_name}`,
    );
  }
}

export function postIfRoundLocked(round: RoundRow) {
  if (!round.is_locked) return;
  const fmt = round.format === "singles" ? "Singles" : round.format === "scramble_2man" ? "2-man scramble" : "4-man scramble";
  insertSystemMessageIfNew(`🔒 Day ${round.day} · ${fmt} · Final`);
}

export function postTeeTimeAlertIfDue() {
  const db = getDb();
  const rounds = db.prepare("SELECT * FROM rounds").all() as RoundRow[];
  const now = new Date();
  for (const r of rounds) {
    const start = new Date(`${r.date}T${r.tee_time}`);
    const minutesTo = (start.getTime() - now.getTime()) / 60000;
    if (minutesTo >= 25 && minutesTo <= 35) {
      insertSystemMessageIfNew(`⏰ Day ${r.day} tees off in 30 min · ${r.course_name}`);
    }
  }
}
