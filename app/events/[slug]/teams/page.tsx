import { notFound } from "next/navigation";
import { getEventById, runWithEvent } from "@/lib/repo/events";
import { listPlayers, listTeams } from "@/lib/repo/players";
import { roundHandicap } from "@/lib/scoring/handicaps";

export const dynamic = "force-dynamic";

export default async function EventTeamsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = getEventById(slug);
  if (!event) notFound();

  const { teams, players } = runWithEvent(slug, () => ({
    teams: listTeams(),
    players: listPlayers(),
  }));

  const byTeam = new Map<string, typeof players>();
  for (const p of players) {
    const arr = byTeam.get(p.team_id) ?? [];
    arr.push(p);
    byTeam.set(p.team_id, arr);
  }
  for (const arr of byTeam.values()) {
    arr.sort((a, b) => a.team_slot.localeCompare(b.team_slot));
  }

  return (
    <div className="paper-grain">
      <div className="mx-auto max-w-[1100px] px-5 md:px-8 py-10 md:py-14">
        <div
          className="font-ui uppercase"
          style={{
            fontSize: 11,
            letterSpacing: "0.32em",
            color: "var(--color-gold)",
            fontWeight: 500,
          }}
        >
          {event.name.toUpperCase()} · ROSTER
        </div>
        <h1
          className="font-display text-[var(--color-navy)] mt-3 mb-8"
          style={{ fontSize: 44, lineHeight: 1, letterSpacing: "-0.01em" }}
        >
          The Field.
        </h1>

        <div className="grid md:grid-cols-2 gap-x-10 gap-y-10">
          {teams.map((t) => {
            const ps = byTeam.get(t.id) ?? [];
            return (
              <section key={t.id}>
                <div
                  className="flex items-center gap-2.5 pb-2"
                  style={{ borderBottom: "1px solid var(--color-gold)" }}
                >
                  <span
                    className="inline-block rounded-full"
                    style={{
                      width: 12,
                      height: 12,
                      background: t.display_color,
                    }}
                  />
                  <span
                    className="font-display text-[var(--color-navy)]"
                    style={{ fontSize: 24 }}
                  >
                    {t.name}
                  </span>
                </div>
                {ps.map((p) => (
                  <div
                    key={p.id}
                    className="grid items-center py-3"
                    style={{
                      gridTemplateColumns: "30px minmax(0,1fr) 64px",
                      borderBottom: "1px solid var(--color-rule-cream)",
                    }}
                  >
                    <span
                      className="font-ui uppercase"
                      style={{
                        fontSize: 10,
                        letterSpacing: "0.22em",
                        color: "var(--color-gold)",
                        fontWeight: 600,
                      }}
                    >
                      {p.team_slot}
                    </span>
                    <span
                      className="font-display text-[var(--color-navy)] truncate"
                      style={{ fontSize: 19 }}
                    >
                      {p.name}
                    </span>
                    <span
                      className="font-mono text-right"
                      style={{ fontSize: 12, color: "var(--color-stone)" }}
                    >
                      HCP {roundHandicap(p.handicap)}
                    </span>
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
