import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventById } from "@/lib/repo/events";

export const dynamic = "force-dynamic";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = getEventById(slug);
  if (!event) notFound();

  return (
    <div className="min-h-[100dvh] bg-[var(--color-cream)] flex flex-col">
      <header
        className="paper-grain"
        style={{ borderBottom: "1px solid var(--color-gold)" }}
      >
        <div className="mx-auto max-w-[1280px] px-5 md:px-8 py-4 md:py-5 flex items-center justify-between gap-4">
          <Link href={`/events/${slug}`} className="leading-tight min-w-0">
            <div
              className="font-ui uppercase"
              style={{
                fontSize: 9,
                letterSpacing: "0.32em",
                color: "var(--color-gold)",
                fontWeight: 500,
              }}
            >
              EVENT
            </div>
            <div
              className="font-display text-[var(--color-navy)] truncate"
              style={{ fontSize: 22, lineHeight: 1.05 }}
            >
              {event.name}
            </div>
          </Link>
          <nav className="flex items-center gap-5 md:gap-7">
            <Link
              href={`/events/${slug}`}
              className="font-ui uppercase text-[var(--color-navy)]"
              style={{ fontSize: 10, letterSpacing: "0.24em" }}
            >
              Home
            </Link>
            <Link
              href={`/events/${slug}/leaderboard`}
              className="font-ui uppercase text-[var(--color-navy)]"
              style={{ fontSize: 10, letterSpacing: "0.24em" }}
            >
              Leaderboard
            </Link>
            <Link
              href={`/events/${slug}/teams`}
              className="font-ui uppercase text-[var(--color-navy)] hidden sm:inline"
              style={{ fontSize: 10, letterSpacing: "0.24em" }}
            >
              Roster
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer
        className="paper-grain"
        style={{ borderTop: "1px solid var(--color-rule-cream)" }}
      >
        <div
          className="mx-auto max-w-[1280px] px-5 md:px-8 py-6 font-ui uppercase text-center"
          style={{
            fontSize: 9,
            letterSpacing: "0.28em",
            color: "var(--color-stone)",
          }}
        >
          {event.name}
          {event.start_date && event.end_date
            ? ` · ${event.start_date} – ${event.end_date}`
            : ""}
        </div>
      </footer>
    </div>
  );
}
