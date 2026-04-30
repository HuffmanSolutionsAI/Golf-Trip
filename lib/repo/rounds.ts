import "server-only";
import { getDb } from "@/lib/db";
import type { HoleRow, RoundRow, TeeTimeGroup } from "@/lib/types";

export function listRounds(): RoundRow[] {
  return getDb().prepare("SELECT * FROM rounds ORDER BY day").all() as RoundRow[];
}

export function getRound(id: string): RoundRow | null {
  const row = getDb().prepare("SELECT * FROM rounds WHERE id = ?").get(id) as RoundRow | undefined;
  return row ?? null;
}

export function getRoundByDay(day: 1 | 2 | 3): RoundRow | null {
  const row = getDb().prepare("SELECT * FROM rounds WHERE day = ?").get(day) as RoundRow | undefined;
  return row ?? null;
}

export function listHoles(roundId: string): HoleRow[] {
  return getDb()
    .prepare("SELECT * FROM holes WHERE round_id = ? ORDER BY hole_number")
    .all(roundId) as HoleRow[];
}

export function listAllHoles(): HoleRow[] {
  return getDb().prepare("SELECT * FROM holes ORDER BY round_id, hole_number").all() as HoleRow[];
}

export function listTeeTimeGroups(roundId: string): TeeTimeGroup[] {
  const rows = getDb()
    .prepare(
      `SELECT ttg.group_number, ttg.position, p.id, p.name, p.team_id, t.display_color
       FROM tee_time_groups ttg
       JOIN players p ON p.id = ttg.player_id
       JOIN teams  t ON t.id = p.team_id
       WHERE ttg.round_id = ?
       ORDER BY ttg.group_number, ttg.position`,
    )
    .all(roundId) as {
    group_number: number;
    position: number;
    id: string;
    name: string;
    team_id: string;
    display_color: string;
  }[];

  const map = new Map<number, TeeTimeGroup>();
  for (const r of rows) {
    if (!map.has(r.group_number)) {
      map.set(r.group_number, { group_number: r.group_number, players: [] });
    }
    map.get(r.group_number)!.players.push({
      id: r.id,
      name: r.name,
      team_id: r.team_id,
      display_color: r.display_color,
    });
  }
  return Array.from(map.values()).sort((a, b) => a.group_number - b.group_number);
}
