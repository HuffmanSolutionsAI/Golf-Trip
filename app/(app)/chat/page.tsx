import { createServerSupabase } from "@/lib/supabase/server";
import { ChatView } from "./ChatView";
import type { ChatMessageRow, PlayerRow, TeamRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const supabase = await createServerSupabase();

  const [{ data: msgs }, { data: players }, { data: teams }] = await Promise.all([
    supabase
      .from("chat_messages")
      .select("*")
      .order("posted_at", { ascending: true })
      .limit(500),
    supabase.from("players").select("*"),
    supabase.from("teams").select("*"),
  ]);

  const teamById = new Map((teams ?? []).map((t: TeamRow) => [t.id, t]));
  const playersById = new Map((players ?? []).map((p: PlayerRow) => [p.id, p]));

  const enriched = (msgs ?? []).map((m) => {
    const player = m.player_id ? playersById.get(m.player_id) : null;
    const team = player ? teamById.get(player.team_id) : null;
    return {
      ...(m as ChatMessageRow),
      playerName: player?.name ?? null,
      teamColor: team?.display_color ?? null,
      teamName: team?.name ?? null,
    };
  });

  return <ChatView initial={enriched} />;
}
