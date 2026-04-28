// The N&P Seal — refined SVG. Per Brand Standards §3.1:
//   • Circular monogram on Midnight Navy
//   • Double Gold Leaf ring (outer gold, inner cream-on-navy hairline)
//   • "THE INVITATIONAL" arcs across the top
//   • "N&P" centered, italic transitional serif (& in gold)
//   • "EST. MMXXII" horizontal at base, flanked by ornaments

import { useId } from "react";

type SealProps = {
  size?: number;
  className?: string;
};

export function Seal({ size = 200, className }: SealProps) {
  const id = useId().replace(/:/g, "");
  const arcTop = `${id}-arc-top`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="The Neal & Pam Invitational seal"
    >
      <defs>
        <path id={arcTop} d="M 32 100 A 68 68 0 0 1 168 100" fill="none" />
      </defs>

      <circle cx="100" cy="100" r="96" fill="var(--color-navy)" />
      <circle cx="100" cy="100" r="92" fill="none" stroke="var(--color-gold)" strokeWidth="2" />
      <circle cx="100" cy="100" r="86" fill="none" stroke="var(--color-gold)" strokeWidth="0.6" opacity="0.85" />
      <circle cx="100" cy="100" r="78" fill="none" stroke="var(--color-cream)" strokeWidth="0.4" opacity="0.45" />

      <text
        fontFamily="Inter, sans-serif"
        fontWeight="500"
        fontSize="8.4"
        letterSpacing="3.2"
        fill="var(--color-cream)"
      >
        <textPath href={`#${arcTop}`} startOffset="50%" textAnchor="middle">
          THE  INVITATIONAL
        </textPath>
      </text>

      <text
        x="100"
        y="118"
        textAnchor="middle"
        fontFamily="'DM Serif Display', 'Playfair Display', Georgia, serif"
        fontStyle="italic"
        fontWeight="400"
        fontSize="56"
        fill="var(--color-cream)"
        letterSpacing="-1"
      >
        N
        <tspan fill="var(--color-gold)" dx="-2">&amp;</tspan>
        <tspan dx="-2">P</tspan>
      </text>

      <g transform="translate(100,150)">
        <circle cx="-30" cy="0" r="1.4" fill="var(--color-gold)" />
        <circle cx="-26" cy="0" r="0.9" fill="var(--color-gold)" />
        <circle cx="30" cy="0" r="1.4" fill="var(--color-gold)" />
        <circle cx="26" cy="0" r="0.9" fill="var(--color-gold)" />
        <text
          x="0"
          y="3"
          textAnchor="middle"
          fontFamily="Inter, sans-serif"
          fontWeight="500"
          fontSize="7"
          letterSpacing="2.4"
          fill="var(--color-gold)"
        >
          EST.  MMXXII
        </text>
      </g>
    </svg>
  );
}
