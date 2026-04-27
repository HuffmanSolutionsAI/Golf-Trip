import { listRecentMessages } from "@/lib/repo/chat";
import { listPlayers, listTeams } from "@/lib/repo/players";
import { ChatView, type EnrichedMessage } from "./ChatView";

export const dynamic = "force-dynamic";

export default function ChatPage() {
  const msgs = listRecentMessages(500);
  const players = new Map(listPlayers().map((p) => [p.id, p]));
  const teams = new Map(listTeams().map((t) => [t.id, t]));

  const enriched: EnrichedMessage[] = msgs.map((m) => {
    const player = m.player_id ? players.get(m.player_id) ?? null : null;
    const team = player ? teams.get(player.team_id) ?? null : null;
    return {
      ...m,
      playerName: player?.name ?? null,
      teamColor: team?.display_color ?? null,
      teamName: team?.name ?? null,
    };
  });

  return <ChatView initial={enriched} />;
}
