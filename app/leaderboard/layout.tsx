import { getCurrentPlayer } from "@/lib/session";
import { TopNav } from "@/components/layout/TopNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { BottomNav } from "@/components/layout/BottomNav";

export const dynamic = "force-dynamic";

export default async function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const player = await getCurrentPlayer();

  return (
    <div className="min-h-[100dvh] bg-[var(--color-cream)] flex flex-col">
      <TopNav
        playerName={player?.name ?? null}
        teamName={player?.team?.name ?? null}
        isAdmin={!!player?.is_admin}
        spectator={!player}
      />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
