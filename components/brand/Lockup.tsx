// The horizontal lockup — for formal applications (sign-in, headers, hero).
// THE / Neal & Pam / INVITATIONAL — flanked by gold rules.

type LockupProps = {
  width?: number;
  variant?: "cream" | "navy";
  className?: string;
};

export function Lockup({ width = 320, variant = "cream", className }: LockupProps) {
  const ink = variant === "cream" ? "var(--color-cream)" : "var(--color-navy)";
  const gold = "var(--color-gold)";
  return (
    <div
      className={className}
      style={{ width, textAlign: "center", color: ink }}
      aria-label="The Neal & Pam Invitational"
    >
      <div style={{ height: 1, background: gold, opacity: 0.7 }} />
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 10,
          letterSpacing: "0.32em",
          fontWeight: 500,
          marginTop: 8,
          opacity: 0.85,
        }}
      >
        THE
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: width * 0.18,
          lineHeight: 1,
          margin: "2px 0",
          letterSpacing: "-0.01em",
        }}
      >
        Neal &amp; Pam
      </div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 10,
          letterSpacing: "0.32em",
          fontWeight: 500,
          marginBottom: 8,
          opacity: 0.85,
        }}
      >
        INVITATIONAL
      </div>
      <div style={{ height: 1, background: gold, opacity: 0.7 }} />
    </div>
  );
}

export function LockupInline({ variant = "cream" }: { variant?: "cream" | "navy" }) {
  const color = variant === "cream" ? "var(--color-cream)" : "var(--color-navy)";
  return (
    <span
      className="font-ui"
      style={{
        color,
        fontSize: "0.6875rem",
        letterSpacing: "0.32em",
        textTransform: "uppercase",
        fontWeight: 600,
      }}
    >
      THE INVITATIONAL
    </span>
  );
}
