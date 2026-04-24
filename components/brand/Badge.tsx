// Badge.tsx — circular N&P monogram seal.
// Exact composition per §4 of the build brief.

type BadgeProps = {
  size?: number;
  variant?: "dark" | "light";
  className?: string;
};

export function Badge({ size = 48, variant = "dark", className }: BadgeProps) {
  const isDark = variant === "dark";
  const fill = isDark ? "#1A2E3B" : "#F3ECD8";
  const textMain = isDark ? "#F3ECD8" : "#1A2E3B";
  const gold = "#B08840";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="The Neal & Pam Invitational badge"
      className={className}
    >
      <defs>
        <path id="badge-top-arc" d="M 28 82 A 52 52 0 0 1 132 82" fill="none" />
      </defs>
      <circle cx="80" cy="80" r="75" fill={fill} stroke={gold} strokeWidth="1.5" />
      <circle cx="80" cy="80" r="68" fill="none" stroke={textMain} strokeWidth="0.5" opacity="0.6" />
      <text
        fontFamily="Inter, sans-serif"
        fontWeight={500}
        fontSize="8"
        letterSpacing="3"
        fill={textMain}
      >
        <textPath href="#badge-top-arc" startOffset="50%" textAnchor="middle">
          THE INVITATIONAL
        </textPath>
      </text>
      <text
        x="80"
        y="97"
        textAnchor="middle"
        fontFamily="'Playfair Display', serif"
        fontStyle="italic"
        fontWeight={500}
        fontSize="40"
        fill={textMain}
      >
        N&amp;P
      </text>
      <line x1="52" y1="110" x2="108" y2="110" stroke={gold} strokeWidth="0.5" />
      <text
        x="80"
        y="124"
        textAnchor="middle"
        fontFamily="Inter, sans-serif"
        fontWeight={500}
        fontSize="7"
        letterSpacing="2"
        fill={gold}
      >
        EST. MMXXII
      </text>
    </svg>
  );
}
