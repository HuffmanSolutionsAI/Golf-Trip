import Link from "next/link";
import { listPlayers, listTeams } from "@/lib/repo/players";
import type { PlayerRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function TeamsIndexPage() {
  const teams = listTeams();
  const players = listPlayers();
  const byTeam = new Map<string, PlayerRow[]>();
  for (const p of players) {
    if (!byTeam.has(p.team_id)) byTeam.set(p.team_id, []);
    byTeam.get(p.team_id)!.push(p);
  }

  return (
    <div>
      <div
        className="paper-grain"
        style={{ borderBottom: "1px solid var(--color-gold)" }}
      >
        <div className="mx-auto max-w-[1280px] px-5 md:px-8 py-12 md:py-16">
          <div
            className="font-ui uppercase"
            style={{
              fontSize: 11,
              letterSpacing: "0.32em",
              color: "var(--color-gold)",
              fontWeight: 500,
            }}
          >
            The Field · Year V
          </div>
          <h1
            className="font-display text-[var(--color-navy)] mt-3"
            style={{
              fontSize: 56,
              lineHeight: 1,
              letterSpacing: "-0.01em",
            }}
          >
            Twenty members.
          </h1>
          <p
            className="font-body-serif italic mt-4"
            style={{
              fontSize: 17,
              opacity: 0.7,
              color: "var(--color-stone)",
              lineHeight: 1.55,
              maxWidth: 540,
            }}
          >
            The field is fixed. Five teams of four. By invitation only.
          </p>
        </div>
      </div>

      <div className="paper-grain">
        <div className="mx-auto max-w-[1280px] px-5 md:px-8 py-10 md:py-14">
          {teams.map((team) => {
            const members = (byTeam.get(team.id) ?? []).slice().sort((a, b) =>
              a.team_slot.localeCompare(b.team_slot),
            );
            const captain = members.find((p) => p.team_slot === "A");
            return (
              <div key={team.id} className="mb-10 md:mb-14">
                <div
                  className="flex items-baseline justify-between pb-3"
                  style={{ borderBottom: "1px solid var(--color-gold)" }}
                >
                  <Link
                    href={`/teams/${team.id}`}
                    className="flex items-center gap-3"
                  >
                    <span
                      className="inline-block rounded-full"
                      style={{
                        width: 12,
                        height: 12,
                        background: team.display_color,
                      }}
                    />
                    <span
                      className="font-display text-[var(--color-navy)]"
                      style={{ fontSize: 40, lineHeight: 1 }}
                    >
                      {team.name}
                    </span>
                  </Link>
                  <span
                    className="font-ui uppercase"
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.3em",
                      color: "var(--color-stone)",
                    }}
                  >
                    {captain ? `Captain · ${captain.name}` : "Four men"}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mt-6">
                  {members.map((p) => (
                    <Link
                      key={p.id}
                      href={`/players/${p.id}`}
                      className="block pb-3.5"
                      style={{ borderBottom: "1px solid var(--color-rule-cream)" }}
                    >
                      <div
                        className="grid place-items-center mb-2.5"
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 999,
                          background: "var(--color-paper)",
                          border: "1px solid var(--color-rule)",
                          fontFamily: "var(--font-display)",
                          fontStyle: "italic",
                          fontSize: 22,
                          color: "var(--color-navy)",
                        }}
                      >
                        {p.name.slice(0, 2)}
                      </div>
                      <div
                        className="font-display text-[var(--color-navy)]"
                        style={{ fontSize: 22, lineHeight: 1.1 }}
                      >
                        {p.name}
                      </div>
                      <div
                        className="font-ui uppercase mt-1.5"
                        style={{
                          fontSize: 9,
                          letterSpacing: "0.25em",
                          color: "var(--color-stone)",
                        }}
                      >
                        HCP {p.handicap} · SLOT {p.team_slot}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
