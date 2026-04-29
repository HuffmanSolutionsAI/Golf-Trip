import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, genId } from "@/lib/db";
import { checkCommissioner } from "@/lib/auth/eventPermissions";
import { emitChange } from "@/lib/events";
import type { RoundRow } from "@/lib/types";

export const runtime = "nodejs";

const Body = z.object({
  group_number: z.number().int().min(1).max(99).optional(),
  scheduled_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, "HH:MM (24-hour)")
    .transform((s) => (s.length === 5 ? `${s}:00` : s))
    .optional(),
  scorer_player_id: z.string().min(1).optional(),
  match_ids: z.array(z.string()).optional(),
  scramble_entry_ids: z.array(z.string()).optional(),
});

// Create a tee group on a round, optionally with members and a scorer.
// (Plan A · Phase 3e)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string; roundId: string }> },
) {
  const { slug, roundId } = await params;
  const guard = await checkCommissioner(slug);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const db = getDb();
  const round = db
    .prepare("SELECT * FROM rounds WHERE id = ? AND event_id = ?")
    .get(roundId, slug) as RoundRow | undefined;
  if (!round) {
    return NextResponse.json({ error: "Unknown round." }, { status: 404 });
  }

  let groupNumber = parsed.data.group_number;
  if (groupNumber === undefined) {
    const max = db
      .prepare(
        "SELECT COALESCE(MAX(group_number), 0) AS n FROM tee_groups WHERE round_id = ?",
      )
      .get(roundId) as { n: number };
    groupNumber = max.n + 1;
  }

  // Validate optional members are unbound and belong to this round.
  if (parsed.data.match_ids?.length) {
    for (const mid of parsed.data.match_ids) {
      const ok = db
        .prepare(
          `SELECT 1 FROM matches WHERE id = ? AND round_id = ?`,
        )
        .get(mid, roundId);
      if (!ok) {
        return NextResponse.json(
          { error: `Match ${mid} doesn't belong to this round.` },
          { status: 400 },
        );
      }
      const bound = db
        .prepare(`SELECT 1 FROM tee_group_matches WHERE match_id = ?`)
        .get(mid);
      if (bound) {
        return NextResponse.json(
          { error: `Match ${mid} is already in a group.` },
          { status: 409 },
        );
      }
    }
  }
  if (parsed.data.scramble_entry_ids?.length) {
    for (const eid of parsed.data.scramble_entry_ids) {
      const ok = db
        .prepare(
          `SELECT 1 FROM scramble_entries WHERE id = ? AND round_id = ?`,
        )
        .get(eid, roundId);
      if (!ok) {
        return NextResponse.json(
          { error: `Entry ${eid} doesn't belong to this round.` },
          { status: 400 },
        );
      }
      const bound = db
        .prepare(
          `SELECT 1 FROM tee_group_entries WHERE scramble_entry_id = ?`,
        )
        .get(eid);
      if (bound) {
        return NextResponse.json(
          { error: `Entry ${eid} is already in a group.` },
          { status: 409 },
        );
      }
    }
  }
  if (parsed.data.scorer_player_id) {
    const ok = db
      .prepare(
        `SELECT 1 FROM players WHERE id = ? AND event_id = ?`,
      )
      .get(parsed.data.scorer_player_id, slug);
    if (!ok) {
      return NextResponse.json(
        { error: "Scorer must be a player on this event." },
        { status: 400 },
      );
    }
  }

  const id = genId("tg");
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO tee_groups (id, round_id, group_number, scheduled_time, scorer_player_id)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(
      id,
      roundId,
      groupNumber,
      parsed.data.scheduled_time ?? null,
      parsed.data.scorer_player_id ?? null,
    );
    if (parsed.data.match_ids?.length) {
      const ins = db.prepare(
        `INSERT INTO tee_group_matches (tee_group_id, match_id) VALUES (?, ?)`,
      );
      for (const mid of parsed.data.match_ids) ins.run(id, mid);
    }
    if (parsed.data.scramble_entry_ids?.length) {
      const ins = db.prepare(
        `INSERT INTO tee_group_entries (tee_group_id, scramble_entry_id) VALUES (?, ?)`,
      );
      for (const eid of parsed.data.scramble_entry_ids) ins.run(id, eid);
    }
  });
  tx();

  emitChange("matches", slug);
  return NextResponse.json({ ok: true, id, group_number: groupNumber });
}
