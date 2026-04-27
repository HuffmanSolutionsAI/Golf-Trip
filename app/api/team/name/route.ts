import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentPlayer } from "@/lib/session";
import { getTeam, updateTeamName } from "@/lib/repo/players";
import { recordAudit } from "@/lib/repo/audit";
import { emitChange } from "@/lib/events";

const Body = z.object({
  teamId: z.string().min(1),
  name: z.string().trim().min(1).max(40),
});

export async function POST(req: Request) {
  const me = await getCurrentPlayer();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { teamId, name } = parsed.data;
  const team = getTeam(teamId);
  if (!team) return NextResponse.json({ error: "Team not found." }, { status: 404 });

  const isAdmin = !!me.is_admin;
  const isCaptain = me.team_id === teamId && me.team_slot === "A";
  if (!isAdmin && !isCaptain) {
    return NextResponse.json(
      { error: "Only the team captain or commissioner can rename this team." },
      { status: 403 },
    );
  }

  if (name === team.name) return NextResponse.json({ ok: true });

  updateTeamName(teamId, name);

  recordAudit({
    playerId: me.id,
    action: "team.name.update",
    entityType: "team",
    entityId: teamId,
    before: { name: team.name },
    after: { name },
  });

  emitChange("players");
  return NextResponse.json({ ok: true });
}
