import { Seal } from "@/components/brand/Seal";
import { Lockup } from "@/components/brand/Lockup";

export function SiteFooter() {
  return (
    <footer
      className="navy-grain text-[var(--color-cream)]"
      style={{ borderTop: "1px solid var(--color-gold)" }}
    >
      <div className="mx-auto max-w-[1280px] px-6 md:px-8 py-12 md:py-16 flex flex-col items-center text-center">
        <Seal size={64} />
        <div className="mt-6">
          <Lockup width={280} variant="cream" />
        </div>
        <div
          className="font-display mt-5"
          style={{
            fontSize: 32,
            fontStyle: "italic",
            lineHeight: 1,
            letterSpacing: "-0.01em",
            color: "var(--color-cream)",
          }}
        >
          Pinehurst
        </div>
        <div
          className="rule-gold w-full mt-10"
          style={{ opacity: 0.3 }}
        />
        <div
          className="flex flex-wrap justify-center gap-x-4 gap-y-2 font-ui uppercase mt-4"
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
