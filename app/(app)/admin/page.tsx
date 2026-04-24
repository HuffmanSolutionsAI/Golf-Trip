import { redirect } from "next/navigation";
import { getCurrentPlayer } from "@/lib/session";
import { listPlayers, listTeams } from "@/lib/repo/players";
import { listRounds, listAllHoles } from "@/lib/repo/rounds";
import { listScrambleEntries } from "@/lib/repo/scores";
import { listRecentAudit } from "@/lib/repo/audit";
import { AdminTabs } from "./AdminTabs";
import type { PlayerRow, TeamRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const me = await getCurrentPlayer();
  if (!me?.is_admin) redirect("/home");

  const teams = listTeams();
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const players = listPlayers().map((p) => ({
    ...p,
    team: teamById.get(p.team_id)
      ? { name: teamById.get(p.team_id)!.name }
      : null,
  })) as (PlayerRow & { team: { name: string } | null })[];

  return (
    <AdminTabs
      players={players}
      teams={teams as TeamRow[]}
      rounds={listRounds()}
      holes={listAllHoles()}
      entries={listScrambleEntries()}
      audit={listRecentAudit(100)}
    />
  );
}
