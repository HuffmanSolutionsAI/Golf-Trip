import Link from "next/link";
import { redirect } from "next/navigation";
import { checkCommissioner } from "@/lib/auth/eventPermissions";
import { runWithEvent } from "@/lib/repo/events";
import { listPlayers, listTeams } from "@/lib/repo/players";
import { TeamForm, PlayerForm } from "./AdminForms";

export const dynamic = "force-dynamic";

export default async function EventAdminPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guard = await checkCommissioner(slug);
  if (!guard.ok) {
    if (guard.status === 401) {
      redirect(`/auth/sign-in?next=${encodeURIComponent(`/events/${slug}/admin`)}`);
    }
    if (guard.status === 404) redirect("/dashboard");
    // 403 — show a minimal forbidden page rather than mid-render throw.
    return (
      <div className="paper-grain min-h-[100dvh] flex items-center justify-center px-5">
        <div className="text-center">
          <div
            className="font-ui uppercase"
            style={{
              fontSize: 11,
              letterSpacing: "0.32em",
              color: "var(--color-oxblood)",
              fontWeight: 500,
            }}
          >
            Forbidden
          </div>
          <div
            className="font-display text-[var(--color-navy)] mt-2"
            style={{ fontSize: 28, lineHeight: 1.05 }}
          >
            Commissioner access only.
          </div>
        </div>
      </div>
    );
  }

  const { event } = guard;
  const { teams, players } = runWithEvent(slug, () => ({
    teams: listTeams(),
    players: listPlayers(),
  }));

  const playersByTeam = new Map<string, typeof players>();
  for (const p of players) {
    const arr = playersByTeam.get(p.team_id) ?? [];
    arr.push(p);
    playersByTeam.set(p.team_id, arr);
  }
  for (const arr of playersByTeam.values()) {
    arr.sort((a, b) => a.team_slot.localeCompare(b.team_slot));
  }

  return (
    <div className="paper-grain min-h-[100dvh]">
      <div className="mx-auto max-w-[1100px] px-5 md:px-8 py-10 md:py-14">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <div
              className="font-ui uppercase"
              style={{
                fontSize: 11,
                letterSpacing: "0.32em",
                color: "var(--color-gold)",
                fontWeight: 500,
              }}
            >
              {event.name.toUpperCase()} · ADMIN
            </div>
            <h1
              className="font-display text-[var(--color-navy)] mt-2"
              style={{ fontSize: 40, lineHeight: 1, letterSpacing: "-0.01em" }}
            >
              Set up your event.
            </h1>
          </div>
          <Link
            href={`/events/${slug}`}
            className="font-ui uppercase"
            style={{
              fontSize: 10,
              letterSpacing: "0.24em",
              color: "var(--color-stone)",
            }}
          >
            View public page →
          </Link>
        </div>

        <p
          className="font-body-serif italic mt-3"
          style={{
            fontSize: 14,
            color: "var(--color-stone)",
            opacity: 0.75,
            lineHeight: 1.6,
            maxWidth: 620,
          }}
        >
          Add the teams in the field, then the players on each team. Rounds
          and pairings come next; for now the public event page lists the
          roster you build here.
        </p>

        <Section
          title="Teams"
          count={teams.length}
          empty="No teams yet. Add the first one below."
        >
          {teams.length > 0 && (
            <ul className="mt-2">
              {teams.map((t) => (
                <li
                  key={t.id}
                  className="grid items-center py-2.5"
                  style={{
                    gridTemplateColumns: "20px minmax(0,1fr) 60px",
                    borderBottom: "1px solid var(--color-rule-cream)",
                  }}
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
                    className="font-display text-[var(--color-navy)] truncate"
                    style={{ fontSize: 18 }}
                  >
                    {t.name}
                  </span>
                  <span
                    className="font-mono text-right"
                    style={{ fontSize: 11, color: "var(--color-stone)" }}
                  >
                    #{t.sort_order}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <TeamForm slug={slug} />
          </div>
        </Section>

        <Section
          title="Players"
          count={players.length}
          empty={
            teams.length === 0
              ? "Add at least one team before adding players."
              : "No players yet. Add the first one below."
          }
        >
          {teams.length > 0 && players.length > 0 && (
            <div className="mt-2">
              {teams.map((t) => {
                const ps = playersByTeam.get(t.id) ?? [];
                if (ps.length === 0) return null;
                return (
                  <div key={t.id} className="mt-3">
                    <div className="flex items-center gap-2 pb-1">
                      <span
                        className="inline-block rounded-full"
                        style={{
                          width: 8,
                          height: 8,
                          background: t.display_color,
                        }}
                      />
                      <span
                        className="font-ui uppercase"
                        style={{
                          fontSize: 10,
                          letterSpacing: "0.24em",
                          color: "var(--color-stone)",
                          fontWeight: 600,
                        }}
                      >
                        {t.name}
                      </span>
                    </div>
                    {ps.map((p) => (
                      <div
                        key={p.id}
                        className="grid items-center py-2"
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
                          style={{ fontSize: 17 }}
                        >
                          {p.name}
                          {p.email && (
                            <span
                              className="font-body-serif italic ml-2"
                              style={{
                                fontSize: 12,
                                color: "var(--color-stone)",
                              }}
                            >
                              {p.email}
                            </span>
                          )}
                        </span>
                        <span
                          className="font-mono text-right"
                          style={{ fontSize: 11, color: "var(--color-stone)" }}
                        >
                          HCP {p.handicap}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
          {teams.length > 0 && (
            <div className="mt-5">
              <PlayerForm slug={slug} teams={teams} />
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div
        className="flex items-baseline justify-between pb-2"
        style={{ borderBottom: "1px solid var(--color-gold)" }}
      >
        <h2
          className="font-ui uppercase"
          style={{
            fontSize: 11,
            letterSpacing: "0.28em",
            color: "var(--color-navy)",
            fontWeight: 600,
          }}
        >
          {title}
        </h2>
        <span
          className="font-mono"
          style={{ fontSize: 12, color: "var(--color-stone)" }}
        >
          {count}
        </span>
      </div>
      {count === 0 && (
        <p
          className="font-body-serif italic mt-3"
          style={{
            fontSize: 14,
            color: "var(--color-stone)",
            opacity: 0.65,
          }}
        >
          {empty}
        </p>
      )}
      {children}
    </section>
  );
}
