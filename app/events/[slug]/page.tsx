import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventById, runWithEvent } from "@/lib/repo/events";
import { listTeams, listPlayers } from "@/lib/repo/players";
import { listRounds } from "@/lib/repo/rounds";
import { formatTeeTime, toRoman } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FORMAT_LABEL: Record<string, string> = {
  singles: "Net stroke play",
  scramble_2man: "Two-man scramble",
  scramble_4man: "Four-man scramble",
};

export default async function EventHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = getEventById(slug);
  if (!event) notFound();

  const { teams, players, rounds } = runWithEvent(slug, () => ({
    teams: listTeams(),
    players: listPlayers(),
    rounds: listRounds(),
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
            {event.subtitle ?? "EVENT"}
          </div>
          <h1
            className="font-display text-[var(--color-navy)] mt-3"
            style={{ fontSize: 56, lineHeight: 1, letterSpacing: "-0.01em" }}
          >
            {event.name}.
          </h1>
          {event.start_date && event.end_date && (
            <p
              className="font-body-serif italic mt-4"
              style={{
                fontSize: 17,
                color: "var(--color-stone)",
                opacity: 0.7,
              }}
            >
              {event.start_date} through {event.end_date}.
            </p>
          )}
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={`/events/${slug}/leaderboard`}
              className="font-ui uppercase px-5 py-2.5"
              style={{
                fontSize: 10,
                letterSpacing: "0.28em",
                color: "var(--color-cream)",
                background: "var(--color-navy)",
                fontWeight: 600,
              }}
            >
              Leaderboard
            </Link>
            <Link
              href={`/events/${slug}/teams`}
              className="font-ui uppercase px-5 py-2.5"
              style={{
                fontSize: 10,
                letterSpacing: "0.28em",
                color: "var(--color-navy)",
                border: "1px solid var(--color-navy)",
                fontWeight: 600,
              }}
            >
              The Field
            </Link>
          </div>
        </div>
      </div>

      <div className="paper-grain">
        <div className="mx-auto max-w-[1100px] px-5 md:px-8 py-10 md:py-12">
          <div
            className="font-ui uppercase pb-2"
            style={{
              fontSize: 10,
              letterSpacing: "0.28em",
              color: "var(--color-gold)",
              borderBottom: "1px solid var(--color-gold)",
            }}
          >
            Schedule
          </div>
          {rounds.map((r) => (
            <div
              key={r.id}
              className="grid items-baseline gap-3 py-4"
              style={{
                gridTemplateColumns: "auto minmax(0,1fr) auto",
                borderBottom: "1px solid var(--color-rule-cream)",
              }}
            >
              <span
                className="font-mono"
                style={{ fontSize: 18, color: "var(--color-gold)" }}
              >
                {toRoman(r.day)}
              </span>
              <div className="min-w-0">
                <div
                  className="font-display text-[var(--color-navy)]"
                  style={{ fontSize: 20, lineHeight: 1.1 }}
                >
                  {r.course_name}
                </div>
                <div
                  className="font-body-serif italic mt-0.5"
                  style={{ fontSize: 13, color: "var(--color-stone)" }}
                >
                  {FORMAT_LABEL[r.format] ?? r.format} ·{" "}
                  {formatTeeTime(r.tee_time)}
                </div>
              </div>
              <span
                className="font-mono text-right"
                style={{ fontSize: 12, color: "var(--color-stone)" }}
              >
                {r.date}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="paper-grain" style={{ borderTop: "1px solid var(--color-rule-cream)" }}>
        <div className="mx-auto max-w-[1100px] px-5 md:px-8 py-10 md:py-12">
          <div
            className="font-ui uppercase pb-2"
            style={{
              fontSize: 10,
              letterSpacing: "0.28em",
              color: "var(--color-gold)",
              borderBottom: "1px solid var(--color-gold)",
            }}
          >
            Teams
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 mt-5">
            {teams.map((t) => {
              const ps = playersByTeam.get(t.id) ?? [];
              return (
                <div key={t.id}>
                  <div className="flex items-center gap-2.5 pb-1.5">
                    <span
                      className="inline-block rounded-full"
                      style={{
                        width: 10,
                        height: 10,
                        background: t.display_color,
                      }}
                    />
                    <span
                      className="font-display text-[var(--color-navy)] truncate"
                      style={{ fontSize: 19 }}
                    >
                      {t.name}
                    </span>
                  </div>
                  <div
                    className="font-body-serif"
                    style={{
                      fontSize: 14,
                      color: "var(--color-stone)",
                      lineHeight: 1.55,
                    }}
                  >
                    {ps.map((p) => p.name).join(" · ")}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
