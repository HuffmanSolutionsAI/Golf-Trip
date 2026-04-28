import Link from "next/link";
import { listRounds } from "@/lib/repo/rounds";
import { formatRoundDate, formatTeeTime, toRoman } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FORMAT_LABEL: Record<string, string> = {
  singles: "Singles · net stroke play",
  scramble_2man: "Two-man scramble · pools AD & BC",
  scramble_4man: "Four-man team scramble",
};

export default function SchedulePage() {
  const rounds = listRounds();
  const now = new Date();

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
            THE SCHEDULE
          </div>
          <h1
            className="font-display text-[var(--color-navy)] mt-3"
            style={{
              fontSize: 56,
              lineHeight: 1,
              letterSpacing: "-0.01em",
            }}
          >
            Three rounds.
          </h1>
          <p
            className="font-body-serif italic mt-4"
            style={{
              fontSize: 17,
              color: "var(--color-stone)",
              opacity: 0.7,
              lineHeight: 1.55,
              maxWidth: 540,
            }}
          >
            Pinehurst · May VII through May IX, MMXXVI.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] px-5 md:px-8 py-6 md:py-10">
        {rounds.map((r) => {
          const start = new Date(`${r.date}T${r.tee_time}`);
          const status = r.is_locked ? "FINAL" : start > now ? "UPCOMING" : "LIVE";
          return (
            <div
              key={r.id}
              className="py-5"
              style={{ borderTop: "1px solid var(--color-rule-cream)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2.5">
                    <span className="font-mono text-[14px] text-[var(--color-gold)]">
                      {toRoman(r.day)}
                    </span>
                    <span className="font-display text-[22px] text-[var(--color-navy)]">
                      {r.course_name}
                    </span>
                  </div>
                  <div className="eyebrow-stone mt-1.5" style={{ fontSize: 9 }}>
                    {formatRoundDate(r.date)} · {formatTeeTime(r.tee_time)} · PAR {r.total_par}
                  </div>
                  <div className="font-body-serif italic text-[13px] text-[var(--color-stone)] mt-1.5">
                    {FORMAT_LABEL[r.format]}
                  </div>
                </div>
                <StatusChip status={status as "UPCOMING" | "LIVE" | "FINAL"} />
              </div>
              <Link
                href={`/day${r.day}` as never}
                className="inline-block text-[10px] uppercase tracking-[0.3em] font-ui font-semibold text-[var(--color-gold)] mt-3"
              >
                {r.day === 1 ? "View matches" : r.day === 2 ? "View pools" : "View teams"} →
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: "UPCOMING" | "LIVE" | "FINAL" }) {
  const base = "font-ui font-semibold uppercase text-[8px] tracking-[0.25em]";
  if (status === "UPCOMING")
    return <span className={`${base} text-[var(--color-stone)]`}>{status}</span>;
  if (status === "FINAL")
    return (
      <span className={`${base} bg-[var(--color-navy)] text-[var(--color-cream)] px-2 py-1`}>
        {status}
      </span>
    );
  return (
    <span
      className={`${base} text-[var(--color-oxblood)] border border-[var(--color-oxblood)] px-2 py-0.5 pulse-live`}
    >
      {status}
    </span>
  );
}
