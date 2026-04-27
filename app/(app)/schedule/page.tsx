import Link from "next/link";
import { listRounds } from "@/lib/repo/rounds";
import { formatRoundDate, formatTeeTime } from "@/lib/utils";
import { Card, CardContent, CardEyebrow } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const FORMAT_LABEL: Record<string, string> = {
  singles: "Singles · Net match play",
  scramble_2man: "2-man scramble · Two pools",
  scramble_4man: "4-man scramble · Placement + under par",
};

export default function SchedulePage() {
  const rounds = listRounds();
  const now = new Date();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      <div>
        <div className="eyebrow">Schedule</div>
        <h1 className="font-display text-3xl text-[var(--color-navy)]">Three rounds</h1>
      </div>
      {rounds.map((r) => {
        const start = new Date(`${r.date}T${r.tee_time}`);
        const status = r.is_locked ? "FINAL" : start > now ? "UPCOMING" : "LIVE";
        return (
          <Card key={r.id}>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardEyebrow>
                    Day {r.day} · {formatRoundDate(r.date)} · {formatTeeTime(r.tee_time)}
                  </CardEyebrow>
                  <div className="font-display text-xl text-[var(--color-navy)] mt-1">
                    {r.course_name}
                  </div>
                  <div className="font-body-serif italic text-neutral-700 text-sm">
                    {FORMAT_LABEL[r.format]} · par {r.total_par}
                  </div>
                </div>
                <StatusChip status={status as "UPCOMING" | "LIVE" | "FINAL"} />
              </div>
              <Link
                href={`/day${r.day}` as never}
                className="inline-block text-xs uppercase tracking-widest font-ui text-[var(--color-gold)]"
              >
                {r.day === 1 ? "View matches" : r.day === 2 ? "View pools" : "View teams"} →
              </Link>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function StatusChip({ status }: { status: "UPCOMING" | "LIVE" | "FINAL" }) {
  const base =
    "text-[10px] font-ui font-semibold uppercase tracking-[0.25em] rounded px-2 py-1";
  if (status === "UPCOMING")
    return <span className={`${base} bg-neutral-200 text-neutral-600`}>{status}</span>;
  if (status === "FINAL")
    return (
      <span className={`${base} bg-[var(--color-navy)] text-[var(--color-cream)]`}>
        {status}
      </span>
    );
  return (
    <span className={`${base} bg-[var(--color-oxblood)] text-[var(--color-cream)] pulse-live`}>
      {status}
    </span>
  );
}
