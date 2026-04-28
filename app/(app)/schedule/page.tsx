import Link from "next/link";
import { listRounds } from "@/lib/repo/rounds";
import { formatRoundDate, formatTeeTime, toRoman } from "@/lib/utils";
import { PageHero } from "@/components/layout/PageHero";

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
    <div className="paper-grain">
      <PageHero
        eyebrow="THE SCHEDULE"
        title="Three rounds"
        subtitle="Pinehurst · May VII through May IX, MMXXVI."
      />

      <div className="mx-auto max-w-3xl px-4 py-4">
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
