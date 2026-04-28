import "server-only";
import { computeLeaderboard } from "@/lib/repo/standings";
import { listRounds } from "@/lib/repo/rounds";
import { listAllScores } from "@/lib/repo/scores";
import { LiveTickerClient } from "./LiveTickerClient";

// Sticky live ticker: oxblood LIVE pulse + day/course + top-4 standings.
// Hidden when no round is in progress (render nothing rather than dead chrome).
export async function LiveTicker() {
  const rounds = listRounds();
  const standings = computeLeaderboard().slice(0, 4);

  // Determine the live round + a rough "thru" indicator. Live = a round with
  // any scores in but not yet locked. If none, ticker is hidden.
  const scores = listAllScores();
  let liveRound: (typeof rounds)[number] | undefined;
  let holesIn = 0;
  for (const r of rounds) {
    const roundScores = scores.filter((s) => s.round_id === r.id);
    if (!r.is_locked && roundScores.length > 0) {
      liveRound = r;
      // approximate "thru" = max hole_number with at least one score
      holesIn = roundScores.reduce((m, s) => Math.max(m, s.hole_number), 0);
      break;
    }
  }

  if (!liveRound) return null;

  return (
    <LiveTickerClient
      day={liveRound.day}
      course={liveRound.course_name}
      thru={holesIn}
      standings={standings.map((s) => ({
        teamId: s.team_id,
        rank: s.rank,
        name: s.name,
        displayColor: s.display_color,
        total: s.total_points,
      }))}
    />
  );
}
