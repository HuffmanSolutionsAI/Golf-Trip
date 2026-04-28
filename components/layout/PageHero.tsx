// Navy field hero band used at the top of round / section pages.
// Matches the design's "section banner": eyebrow + italic display title +
// optional italic body subtitle, all on the navy-grain field.

type PageHeroProps = {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
};

export function PageHero({ eyebrow, title, subtitle, right }: PageHeroProps) {
  return (
    <div
      className="navy-grain text-[var(--color-cream)] px-4 pt-5 pb-5"
      style={{ borderBottom: "1px solid rgba(165,136,89,0.4)" }}
    >
      <div className="mx-auto max-w-3xl flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="eyebrow-cream" style={{ opacity: 0.85 }}>
            {eyebrow}
          </div>
          <h1
            className="font-display mt-1.5"
            style={{ fontSize: 30, lineHeight: 1, color: "var(--color-cream)" }}
          >
            {title}
          </h1>
          {subtitle && (
            <div
              className="font-body-serif italic mt-2 text-[13px]"
              style={{ color: "var(--color-cream)", opacity: 0.7 }}
            >
              {subtitle}
            </div>
          )}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </div>
  );
}
