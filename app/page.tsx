import { redirect } from "next/navigation";
import { Seal } from "@/components/brand/Seal";
import { listPlayers, listTeams } from "@/lib/repo/players";
import { getCurrentPlayer } from "@/lib/session";
import { LandingSignInForm } from "./_landing/SignInForm";

export const dynamic = "force-dynamic";

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ signin?: string }>;
}) {
  const current = await getCurrentPlayer();
  if (current) redirect("/home");
  const { signin } = await searchParams;
  if (!signin) redirect("/home");

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
      <div
        className="flex items-center justify-between px-5 md:px-8 py-5 md:py-6"
        style={{ borderBottom: "1px solid rgba(165,136,89,0.3)" }}
      >
        <div className="flex items-center gap-3.5">
          <Seal size={36} />
          <div className="leading-tight">
            <div className="font-display" style={{ fontSize: 18, lineHeight: 1 }}>
              Neal &amp; Pam
            </div>
            <div
              className="font-ui uppercase"
              style={{
                fontSize: 8,
                letterSpacing: "0.32em",
                color: "var(--color-gold)",
                marginTop: 3,
                fontWeight: 500,
              }}
            >
              YEAR V · MMXXVI
            </div>
          </div>
        </div>
        <div
          className="eyebrow-cream"
          style={{ fontSize: 9, opacity: 0.6 }}
        >
          BY INVITATION ONLY
        </div>
      </div>

      <div className="flex-1 grid md:grid-cols-2 items-center">
        <div className="px-6 md:px-20 py-10 md:py-0 text-center md:text-left flex flex-col items-center md:items-start justify-center">
          <Seal size={130} className="hidden md:block" />
          <Seal size={100} className="md:hidden" />
          <div
            className="font-display mt-6 md:mt-7"
            style={{
              fontSize: 56,
              lineHeight: 0.95,
              letterSpacing: "-0.01em",
            }}
          >
            <span className="md:hidden">Year V.</span>
            <span className="hidden md:inline">Year V.</span>
            <br />
            Pinehurst.
          </div>
          <div
            className="font-body-serif italic mt-4 md:mt-5"
            style={{
              fontSize: 16,
              opacity: 0.7,
              lineHeight: 1.55,
              maxWidth: 360,
            }}
          >
            The field is twenty. Three rounds. One Cup. May VII through May IX,
            MMXXVI.
          </div>
        </div>

        <div className="px-6 md:px-20 pb-10 md:py-0 flex justify-center">
          <div className="w-full max-w-[360px]">
            <div className="eyebrow">Sign in</div>
            <div
              className="font-display mt-1.5"
              style={{ fontSize: 30, color: "var(--color-cream)" }}
            >
              The Field
            </div>
            <div className="rule-gold mt-4 mb-5" />
            <LandingSignInForm players={options} />
            <div
              className="font-body-serif italic text-center mt-4"
              style={{
                fontSize: 12,
                opacity: 0.55,
              }}
            >
              Forgot your passcode? Ask the commissioner.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
