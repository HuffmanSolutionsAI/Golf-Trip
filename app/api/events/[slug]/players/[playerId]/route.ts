import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { checkCommissioner } from "@/lib/auth/eventPermissions";
import { emitChange } from "@/lib/events";

export const runtime = "nodejs";

// Edit a player. (Plan A · Phase 3h)
// All fields optional. team_id / team_slot edits go through a slot-
// collision check; email "" maps to NULL so commissioners can clear it.
const Body = z
  .object({
    name: z.string().min(1).max(80).optional(),
    handicap: z.number().min(-10).max(54).optional(),
    email: z.string().email().or(z.literal("")).optional(),
    team_id: z.string().min(1).optional(),
    team_slot: z.enum(["A", "B", "C", "D"]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update." });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string; playerId: string }> },
) {
  const { slug, playerId } = await params;
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
  const player = db
    .prepare("SELECT * FROM players WHERE id = ? AND event_id = ?")
    .get(playerId, slug) as
    | { id: string; team_id: string; team_slot: "A" | "B" | "C" | "D" }
    | undefined;
  if (!player) {
    return NextResponse.json({ error: "Unknown player." }, { status: 404 });
  }

  const targetTeamId = parsed.data.team_id ?? player.team_id;
  const targetSlot = parsed.data.team_slot ?? player.team_slot;

  if (parsed.data.team_id !== undefined) {
    const teamOk = db
      .prepare("SELECT 1 FROM teams WHERE id = ? AND event_id = ?")
      .get(parsed.data.team_id, slug);
    if (!teamOk) {
      return NextResponse.json({ error: "Unknown team." }, { status: 400 });
    }
  }

  if (
    (parsed.data.team_id !== undefined || parsed.data.team_slot !== undefined) &&
    (targetTeamId !== player.team_id || targetSlot !== player.team_slot)
  ) {
    const taken = db
      .prepare(
        "SELECT id FROM players WHERE team_id = ? AND team_slot = ? AND id <> ?",
      )
      .get(targetTeamId, targetSlot, playerId) as { id: string } | undefined;
    if (taken) {
      return NextResponse.json(
        { error: `Slot ${targetSlot} already taken on this team.` },
        { status: 409 },
      );
    }
  }

  const sets: string[] = [];
  const values: unknown[] = [];
  if (parsed.data.name !== undefined) {
    sets.push("name = ?");
    values.push(parsed.data.name);
  }
  if (parsed.data.handicap !== undefined) {
    sets.push("handicap = ?");
    values.push(parsed.data.handicap);
  }
  if (parsed.data.email !== undefined) {
    sets.push("email = ?");
    values.push(parsed.data.email === "" ? null : parsed.data.email.toLowerCase());
  }
  if (parsed.data.team_id !== undefined) {
    sets.push("team_id = ?");
    values.push(parsed.data.team_id);
  }
  if (parsed.data.team_slot !== undefined) {
    sets.push("team_slot = ?");
    values.push(parsed.data.team_slot);
  }
  sets.push("updated_at = datetime('now')");
  values.push(playerId);
  db.prepare(`UPDATE players SET ${sets.join(", ")} WHERE id = ?`).run(
    ...values,
  );

  emitChange("players", slug);
  return NextResponse.json({ ok: true });
}

// Delete a player. Refuses if the player is still tied to scoring data —
// in any match, scramble entry, or has any hole_scores authored or
// entered. The commissioner has to clean those up first (delete matches /
// auto-fill is reversible via group delete) so destructive cascades stay
// visible. Sessions cascade via FK; tee_groups.scorer_player_id and the
// historical references on audit_log/chat_messages are nulled out so the
// trail survives without dangling FKs. (Plan A · Phase 3i)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string; playerId: string }> },
) {
  const { slug, playerId } = await params;
  const guard = await checkCommissioner(slug);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const db = getDb();
  const player = db
    .prepare("SELECT id, name FROM players WHERE id = ? AND event_id = ?")
    .get(playerId, slug) as { id: string; name: string } | undefined;
  if (!player) {
    return NextResponse.json({ error: "Unknown player." }, { status: 404 });
  }

  const inMatches = db
    .prepare(
      "SELECT COUNT(*) AS n FROM matches WHERE player1_id = ? OR player2_id = ?",
    )
    .get(playerId, playerId) as { n: number };
  if (inMatches.n > 0) {
    return NextResponse.json(
      {
        error: `${player.name} is in ${inMatches.n} match${inMatches.n === 1 ? "" : "es"}. Delete the matches first.`,
      },
      { status: 409 },
    );
  }

  const inEntries = db
    .prepare(
      "SELECT COUNT(*) AS n FROM scramble_participants WHERE player_id = ?",
    )
    .get(playerId) as { n: number };
  if (inEntries.n > 0) {
    return NextResponse.json(
      {
        error: `${player.name} is on ${inEntries.n} scramble entr${inEntries.n === 1 ? "y" : "ies"}. Delete the round's entries first (delete the tee group, then the round, or use the round detail page).`,
      },
      { status: 409 },
    );
  }

  const scoresAuthored = db
    .prepare("SELECT COUNT(*) AS n FROM hole_scores WHERE player_id = ?")
    .get(playerId) as { n: number };
  const scoresEntered = db
    .prepare("SELECT COUNT(*) AS n FROM hole_scores WHERE entered_by = ?")
    .get(playerId) as { n: number };
  if (scoresAuthored.n + scoresEntered.n > 0) {
    return NextResponse.json(
      {
        error: `${player.name} has ${scoresAuthored.n} score${
          scoresAuthored.n === 1 ? "" : "s"
        } recorded and entered ${scoresEntered.n}. Clear those before deleting the player.`,
      },
      { status: 409 },
    );
  }

  const tx = db.transaction(() => {
    db.prepare(
      "UPDATE tee_groups SET scorer_player_id = NULL, updated_at = datetime('now') WHERE scorer_player_id = ?",
    ).run(playerId);
    db.prepare(
      "UPDATE audit_log SET player_id = NULL WHERE player_id = ?",
    ).run(playerId);
    db.prepare(
      "UPDATE chat_messages SET player_id = NULL WHERE player_id = ?",
    ).run(playerId);
    // sessions FK has ON DELETE CASCADE; rows die with the player.
    db.prepare("DELETE FROM players WHERE id = ?").run(playerId);
  });
  tx();

  emitChange("players", slug);
  return NextResponse.json({ ok: true });
}
