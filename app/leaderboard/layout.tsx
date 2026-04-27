import Link from "next/link";
import { getCurrentPlayer } from "@/lib/session";
import { TopNav } from "@/components/layout/TopNav";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { Sidebar } from "@/components/layout/Sidebar";

export const dynamic = "force-dynamic";

export default async function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const player = await getCurrentPlayer();

  if (!player) {
    return (
      <div className="min-h-[100dvh] bg-[var(--color-paper)] flex flex-col">
        <div className="bg-[var(--color-navy-deep)] text-[var(--color-cream)] text-xs font-ui text-center py-2 px-4">
          Viewing as spectator ·{" "}
          <Link href="/" className="underline text-[var(--color-gold-light)]">
            Sign in
          </Link>{" "}
          for score entry.
        </div>
        <main className="flex-1 pb-4">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--color-paper)] flex flex-col">
      <TopNav
        playerName={player.name}
        teamName={player.team?.name}
        isAdmin={!!player.is_admin}
      />
      <div className="flex-1 flex">
        <Sidebar isAdmin={!!player.is_admin} />
        <main className="flex-1 pb-16 md:pb-4">{children}</main>
      </div>
      <BottomTabBar />
    </div>
  );
}
