import { getCurrentPlayer } from "@/lib/session";
import { TopNav } from "@/components/layout/TopNav";
import { LiveTicker } from "@/components/layout/LiveTicker";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const dynamic = "force-dynamic";

export default async function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const player = await getCurrentPlayer();

  return (
    <div className="min-h-[100dvh] bg-[var(--color-cream)] flex flex-col">
      <LiveTicker />
      <TopNav
        playerName={player?.name ?? null}
        teamName={player?.team?.name ?? null}
        isAdmin={!!player?.is_admin}
        spectator={!player}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
