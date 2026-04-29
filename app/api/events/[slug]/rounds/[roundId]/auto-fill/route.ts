import { NextResponse } from "next/server";
import { getDb, genId } from "@/lib/db";
import { checkCommissioner } from "@/lib/auth/eventPermissions";
import { runWithEvent } from "@/lib/repo/events";
import { listPlayers, listTeams } from "@/lib/repo/players";
import { emitChange } from "@/lib/events";
import type { PlayerRow, RoundRow } from "@/lib/types";

export const runtime = "nodejs";

// Auto-fill a scramble round's entries from the current roster.
// (Plan A · Phase 3d)
//
// scramble-pair: each team contributes two entries — pool 'AD' (slots
// A + D) and pool 'BC' (slots B + C). Skips teams that don't have all
// four slots filled and reports the count.
//
// scramble-team: each team contributes one entry with all of its
// players (any slots present).
//
// match-play-net is rejected — pairings need explicit decisions and
// belong on a manual UI (deferred).

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string; roundId: string }> },
) {
  const { slug, roundId } = await params;
  const guard = await checkCommissioner(slug);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const db = getDb();
  const round = db
    .prepare("SELECT * FROM rounds WHERE id = ? AND event_id = ?")
    .get(roundId, slug) as RoundRow | undefined;
  if (!round) {
    return NextResponse.json({ error: "Unknown round." }, { status: 404 });
  }

  if (round.format === "singles") {
    return NextResponse.json(
      { error: "Match play needs manual pairings." },
      { status: 400 },
    );
  }

  // Refuse to overwrite — commissioner has to clear first if they want
  // to redo. (No clear UI yet; punt on that.)
  const existing = db
    .prepare("SELECT COUNT(*) AS n FROM scramble_entries WHERE round_id = ?")
    .get(roundId) as { n: number };
  if (existing.n > 0) {
    return NextResponse.json(
      {
        error: `Round already has ${existing.n} entries. Delete them before re-filling.`,
      },
      { status: 409 },
    );
  }

  const { teams, players } = runWithEvent(slug, () => ({
    teams: listTeams(),
    players: listPlayers(),
  }));
  if (teams.length === 0) {
    return NextResponse.json(
      { error: "Add at least one team before filling entries." },
      { status: 400 },
    );
  }

  const playersByTeam = new Map<string, PlayerRow[]>();
  for (const p of players) {
    const arr = playersByTeam.get(p.team_id) ?? [];
    arr.push(p);
    playersByTeam.set(p.team_id, arr);
  }

  let entriesCreated = 0;
  let participantsCreated = 0;
  const skipped: { team: string; reason: string }[] = [];

  const tx = db.transaction(() => {
    const insEntry = db.prepare(
      `INSERT INTO scramble_entries (id, round_id, team_id, pool)
       VALUES (?, ?, ?, ?)`,
    );
    const insPart = db.prepare(
      `INSERT INTO scramble_participants (scramble_entry_id, player_id)
       VALUES (?, ?)`,
    );

    for (const team of teams) {
      const ps = playersByTeam.get(team.id) ?? [];
      const bySlot = new Map(ps.map((p) => [p.team_slot, p]));

      if (round.format === "scramble_2man") {
        const a = bySlot.get("A");
        const b = bySlot.get("B");
        const c = bySlot.get("C");
        const d = bySlot.get("D");
        if (!a || !b || !c || !d) {
          skipped.push({
            team: team.name,
            reason: "needs all four slots A/B/C/D filled",
          });
          continue;
        }
        const adId = genId("se");
        insEntry.run(adId, roundId, team.id, "AD");
        insPart.run(adId, a.id);
        insPart.run(adId, d.id);
        const bcId = genId("se");
        insEntry.run(bcId, roundId, team.id, "BC");
        insPart.run(bcId, b.id);
        insPart.run(bcId, c.id);
        entriesCreated += 2;
        participantsCreated += 4;
      } else if (round.format === "scramble_4man") {
        if (ps.length === 0) {
          skipped.push({ team: team.name, reason: "no players on team" });
          continue;
        }
        const id = genId("se");
        insEntry.run(id, roundId, team.id, null);
        for (const p of ps) {
          insPart.run(id, p.id);
        }
        entriesCreated += 1;
        participantsCreated += ps.length;
      }
    }
  });
  tx();

  emitChange("scramble_entries", slug);
  return NextResponse.json({
    ok: true,
    entries_created: entriesCreated,
    participants_created: participantsCreated,
    skipped,
  });
}
