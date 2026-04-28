// The Year Mark — typographic only.
//   YEAR
//   V
//   PINEHURST · N.C.
//   MAY 7 — 9 · MMXXVI

type YearMarkProps = {
  year?: string;
  city?: string;
  dates?: string;
  variant?: "cream" | "navy";
  size?: "sm" | "md" | "lg";
};

const SIZES = {
  sm: { yr: 11, num: 56, body: 9, gap: 6, padX: 10, padY: 8 },
  md: { yr: 12, num: 84, body: 10, gap: 8, padX: 16, padY: 12 },
  lg: { yr: 13, num: 120, body: 11, gap: 10, padX: 20, padY: 16 },
} as const;

export function YearMark({
  year = "V",
  city = "PINEHURST · N.C.",
  dates = "MAY 7 — 9 · MMXXVI",
  variant = "cream",
  size = "md",
}: YearMarkProps) {
  const ink = variant === "cream" ? "var(--color-cream)" : "var(--color-navy)";
  const gold = "var(--color-gold)";
  const s = SIZES[size];
  return (
    <div style={{ textAlign: "center", color: ink, padding: `${s.padY}px ${s.padX}px` }}>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: s.yr,
          letterSpacing: "0.4em",
          fontWeight: 500,
          opacity: 0.7,
        }}
      >
        YEAR
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: s.num,
          lineHeight: 1,
          margin: `${s.gap}px 0`,
          letterSpacing: "-0.02em",
        }}
      >
        {year}
      </div>
      <div style={{ height: 1, width: 60, margin: "0 auto", background: gold, opacity: 0.7 }} />
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: s.body,
          letterSpacing: "0.28em",
          fontWeight: 500,
          marginTop: s.gap + 2,
          opacity: 0.9,
        }}
      >
        {city}
      </div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: s.body,
          letterSpacing: "0.22em",
          fontWeight: 400,
          marginTop: 4,
          opacity: 0.7,
        }}
      >
        {dates}
      </div>
    </div>
  );
}
