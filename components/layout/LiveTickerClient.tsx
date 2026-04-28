"use client";

import { useLiveRefresh } from "@/lib/client/useLiveRefresh";
import { toRoman } from "@/lib/utils";

type TickerStanding = {
  teamId: string;
  rank: number;
  name: string;
  displayColor: string;
  total: number;
};

export function LiveTickerClient({
  day,
  course,
  thru,
  standings,
}: {
  day: number;
  course: string;
  thru: number;
  standings: TickerStanding[];
}) {
  useLiveRefresh(["hole_scores", "rounds"]);
  const courseShort = course.toUpperCase();
  return (
    <div
      className="bg-[var(--color-navy-deep)] text-[var(--color-cream)] flex items-center gap-4 md:gap-5 overflow-hidden whitespace-nowrap"
      style={{
        padding: "8px 16px",
        fontFamily: "var(--font-ui)",
        fontSize: 11,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        borderBottom: "1px solid var(--color-gold)",
      }}
    >
      <span
        className="pulse-live shrink-0 inline-flex items-center gap-1.5"
        style={{ color: "var(--color-oxblood)", fontWeight: 600 }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: "var(--color-oxblood)",
          }}
        />
        LIVE
      </span>
      <span className="shrink-0 opacity-70 hidden sm:inline">
        DAY {toRoman(day)} · {courseShort}
        {thru > 0 ? ` · THRU ${thru}` : ""}
      </span>
      <span className="shrink-0 opacity-70 sm:hidden">
        DAY {toRoman(day)} · THRU {thru}
      </span>
      <div
        className="flex gap-3 md:gap-5 overflow-hidden"
        style={{
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.05em",
          textTransform: "none",
        }}
      >
        {standings.map((s, i) => (
          <span
            key={s.teamId}
            className="shrink-0 inline-flex items-center gap-1.5"
            style={{ opacity: i === 0 ? 1 : 0.85 }}
          >
            <span style={{ color: "var(--color-stone)" }}>{s.rank}</span>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: s.displayColor,
              }}
            />
            <span style={{ color: "var(--color-cream)" }} className="truncate">
              {s.name}
            </span>
            <span style={{ color: "var(--color-gold)", fontWeight: 600 }}>
              {s.total}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
