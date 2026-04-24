import { getCurrentPlayer } from "@/lib/server/currentPlayer";
import { TopNav } from "@/components/layout/TopNav";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { redirect } from "next/navigation";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const player = await getCurrentPlayer();
  if (!player) redirect("/");

  return (
    <div className="min-h-[100dvh] bg-[var(--color-paper)] flex flex-col">
      <TopNav
        playerName={player.name}
        teamName={player.team?.name}
        isAdmin={player.is_admin}
      />
      <div className="flex-1 flex">
        <Sidebar isAdmin={player.is_admin} />
        <main className="flex-1 pb-16 md:pb-4">{children}</main>
      </div>
      <BottomTabBar />
    </div>
  );
}
