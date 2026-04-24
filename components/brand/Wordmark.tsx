// Wordmark.tsx — "THE / Neal & Pam / INVITATIONAL" stacked.

type WordmarkProps = {
  variant?: "dark" | "light";
  className?: string;
};

export function Wordmark({ variant = "dark", className }: WordmarkProps) {
  const mainColor = variant === "dark" ? "#1A2E3B" : "#F3ECD8";
  const gold = "#B08840";

  return (
    <div
      className={`flex flex-col items-center gap-1 ${className ?? ""}`}
      aria-label="The Neal & Pam Invitational"
    >
      <div className="w-full border-t" style={{ borderColor: gold, borderWidth: 0.5 }} />
      <span
        className="font-ui"
        style={{
          color: gold,
          fontSize: "0.625rem",
          letterSpacing: "0.4em",
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        THE
      </span>
      <span
        className="font-display italic"
        style={{ color: mainColor, fontSize: "1.75rem", lineHeight: 1, fontWeight: 500 }}
      >
        Neal &amp; Pam
      </span>
      <span
        className="font-ui"
        style={{
          color: mainColor,
          fontSize: "0.6875rem",
          letterSpacing: "0.4em",
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        INVITATIONAL
      </span>
      <div className="w-full border-t" style={{ borderColor: gold, borderWidth: 0.5 }} />
    </div>
  );
}

// Compact inline variant used in the top nav.
export function WordmarkInline({ variant = "light" }: { variant?: "dark" | "light" }) {
  const color = variant === "dark" ? "#1A2E3B" : "#F3ECD8";
  return (
    <span
      className="font-ui"
      style={{
        color,
        fontSize: "0.6875rem",
        letterSpacing: "0.4em",
        textTransform: "uppercase",
        fontWeight: 600,
      }}
    >
      THE INVITATIONAL
    </span>
  );
}
