import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentPlayer } from "@/lib/server/currentPlayer";
import { AdminTabs } from "./AdminTabs";
import type {
  AuditLogRow,
  HoleRow,
  PlayerRow,
  RoundRow,
  ScrambleEntryRow,
  TeamRow,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const me = await getCurrentPlayer();
  if (!me?.is_admin) redirect("/home");

  const supabase = await createServerSupabase();
  const [playersRes, teamsRes, roundsRes, holesRes, entriesRes, auditRes] =
    await Promise.all([
      supabase.from("players").select("*, team:teams(name)").order("team_slot"),
      supabase.from("teams").select("*").order("sort_order"),
      supabase.from("rounds").select("*").order("day"),
      supabase.from("holes").select("*").order("hole_number"),
      supabase.from("scramble_entries").select("*"),
      supabase
        .from("audit_log")
        .select("*")
        .order("occurred_at", { ascending: false })
        .limit(100),
    ]);

  return (
    <AdminTabs
      players={(playersRes.data ?? []) as (PlayerRow & { team: { name: string } | null })[]}
      teams={(teamsRes.data ?? []) as TeamRow[]}
      rounds={(roundsRes.data ?? []) as RoundRow[]}
      holes={(holesRes.data ?? []) as HoleRow[]}
      entries={(entriesRes.data ?? []) as ScrambleEntryRow[]}
      audit={(auditRes.data ?? []) as AuditLogRow[]}
    />
  );
}
