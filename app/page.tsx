import Link from "next/link";
import { redirect } from "next/navigation";
import { Seal } from "@/components/brand/Seal";
import { Lockup } from "@/components/brand/Lockup";
import { YearMark } from "@/components/brand/YearMark";
import { listPlayers, listTeams } from "@/lib/repo/players";
import { getCurrentPlayer } from "@/lib/session";
import { LandingSignInForm } from "./_landing/SignInForm";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const current = await getCurrentPlayer();
  if (current) redirect("/home");

  const players = listPlayers();
  const teams = listTeams();
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const options = players
    .map((p) => ({
      id: p.id,
      name: p.name,
      team: teamById.get(p.team_id)?.name ?? "",
      handicap: p.handicap,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="navy-grain min-h-[100dvh] text-[var(--color-cream)] flex flex-col">
      <div className="flex-1 flex items-center justify-center px-8 py-10">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="flex justify-center">
            <Seal size={140} />
          </div>
          <div className="flex justify-center">
            <Lockup width={250} variant="cream" />
          </div>
          <YearMark size="sm" />
          <div className="pt-2">
            <LandingSignInForm players={options} />
          </div>
          <div className="font-body-serif italic text-sm text-[var(--color-cream)]/65">
            By invitation only. The field is twenty.
          </div>
          <div className="pt-2">
            <Link
              href="/leaderboard"
              className="text-[10px] font-ui uppercase tracking-[0.3em] text-[var(--color-gold-light)] hover:text-[var(--color-gold)]"
            >
              View the field as spectator →
            </Link>
          </div>
        </div>
      </div>
      <div className="px-8 pb-6">
        <div className="rule-gold mb-3" style={{ opacity: 0.4 }} />
        <div className="text-[8px] font-ui uppercase tracking-[0.4em] text-center text-[var(--color-cream)]/45">
          IN HONOR OF NEAL &amp; PAM STAPLETON · SURFSIDE BEACH · EST. MMXXII
        </div>
      </div>
    </div>
  );
}
