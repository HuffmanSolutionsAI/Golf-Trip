import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { listEventsForUser } from "@/lib/auth/roles";
import { getEventById } from "@/lib/repo/events";
import { SignOutButton } from "./SignOutButton";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  commissioner: "Commissioner",
  scorer: "Scorer",
  player: "Player",
  spectator: "Spectator",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/sign-in?next=/dashboard");
  }

  const grants = listEventsForUser(user.id);
  const events = grants
    .map((g) => ({ ...g, event: getEventById(g.event_id) }))
    .filter((g): g is typeof g & { event: NonNullable<typeof g.event> } => !!g.event);

  return (
    <div className="paper-grain min-h-[100dvh]">
      <header
        className="paper-grain"
        style={{ borderBottom: "1px solid var(--color-gold)" }}
      >
        <div className="mx-auto max-w-[1100px] px-5 md:px-8 py-5 md:py-6 flex items-center justify-between gap-4">
          <div>
            <div
              className="font-ui uppercase"
              style={{
                fontSize: 9,
                letterSpacing: "0.32em",
                color: "var(--color-gold)",
                fontWeight: 500,
              }}
            >
              Signed in
            </div>
            <div
              className="font-display text-[var(--color-navy)]"
              style={{ fontSize: 18, lineHeight: 1.1 }}
            >
              {user.display_name ?? user.email}
            </div>
          </div>
          <SignOutButton />
        </div>
      </header>

      <div className="mx-auto max-w-[1100px] px-5 md:px-8 py-10 md:py-14">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h1
            className="font-display text-[var(--color-navy)]"
            style={{ fontSize: 44, lineHeight: 1, letterSpacing: "-0.01em" }}
          >
            My events.
          </h1>
          <Link
            href="/dashboard/new-event"
            className="font-ui uppercase px-5 py-2.5"
            style={{
              fontSize: 10,
              letterSpacing: "0.28em",
              color: "var(--color-cream)",
              background: "var(--color-navy)",
              fontWeight: 600,
            }}
          >
            Create event
          </Link>
        </div>

        <div className="mt-7">
          {events.length === 0 ? (
            <p
              className="font-body-serif italic"
              style={{
                fontSize: 16,
                color: "var(--color-stone)",
                opacity: 0.75,
                lineHeight: 1.6,
              }}
            >
              You haven&apos;t joined any events yet. Create one or ask a
              commissioner to grant you a role.
            </p>
          ) : (
            <ul>
              {events.map(({ event, role }) => (
                <li key={event.id}>
                  <Link
                    href={`/events/${event.id}`}
                    className="grid items-center gap-3 py-4"
                    style={{
                      gridTemplateColumns: "minmax(0,1fr) auto",
                      borderBottom: "1px solid var(--color-rule-cream)",
                    }}
                  >
                    <div className="min-w-0">
                      <div
                        className="font-display text-[var(--color-navy)] truncate"
                        style={{ fontSize: 22 }}
                      >
                        {event.name}
                      </div>
                      <div
                        className="font-body-serif italic mt-0.5"
                        style={{ fontSize: 13, color: "var(--color-stone)" }}
                      >
                        {event.subtitle ? `${event.subtitle} · ` : ""}
                        {event.start_date && event.end_date
                          ? `${event.start_date} – ${event.end_date}`
                          : "No dates set"}
                      </div>
                    </div>
                    <span
                      className="font-ui uppercase"
                      style={{
                        fontSize: 10,
                        letterSpacing: "0.22em",
                        color: "var(--color-gold)",
                        fontWeight: 600,
                      }}
                    >
                      {ROLE_LABEL[role] ?? role}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

