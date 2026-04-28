import { Seal } from "@/components/brand/Seal";
import { Lockup } from "@/components/brand/Lockup";

export function SiteFooter() {
  return (
    <footer
      className="navy-grain text-[var(--color-cream)]"
      style={{ borderTop: "1px solid var(--color-gold)" }}
    >
      <div className="mx-auto max-w-[1280px] px-6 md:px-8 py-10 md:py-14">
        <div className="grid md:grid-cols-[1fr_2fr_1fr] gap-8 md:gap-10 items-start">
          <div>
            <Seal size={72} />
          </div>
          <div className="md:text-center">
            <Lockup width={280} variant="cream" />
            <div
              className="font-body-serif italic mt-4"
              style={{
                fontSize: 13,
                opacity: 0.7,
                lineHeight: 1.55,
                maxWidth: 480,
                margin: "16px auto 0",
              }}
            >
              One mark forever. One small thing new every year. By invitation
              only — in honor of Neal &amp; Pam Stapleton.
            </div>
          </div>
          <div className="md:text-right">
            <div
              className="font-ui uppercase"
              style={{
                fontSize: 9,
                letterSpacing: "0.3em",
                color: "var(--color-gold)",
                fontWeight: 500,
              }}
            >
              YEAR V · MMXXVI
            </div>
            <div
              className="font-body-serif italic mt-1.5"
              style={{ fontSize: 12, opacity: 0.65 }}
            >
              Pinewild · Talamore · Hyland
            </div>
            <div
              className="font-body-serif italic"
              style={{ fontSize: 12, opacity: 0.65 }}
            >
              May 7 — 9
            </div>
          </div>
        </div>
        <div
          className="rule-gold mt-8 mb-4"
          style={{ opacity: 0.3, marginTop: 32, marginBottom: 16 }}
        />
        <div
          className="flex flex-wrap justify-between gap-3 font-ui uppercase"
          style={{
            fontSize: 9,
            letterSpacing: "0.25em",
            color: "var(--color-stone)",
          }}
        >
          <span>Est. MMXXII · Surfside Beach</span>
          <span>By invitation only · The field is twenty</span>
        </div>
      </div>
    </footer>
  );
}
