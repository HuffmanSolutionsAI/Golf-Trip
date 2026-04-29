import "server-only";
import { getBrandOverride } from "@/lib/repo/events";

// Brand tokens applied via CSS custom properties at the event layout
// boundary. (Plan A · Phase 5)
//
// We only override variables the layout/typography/grid system tolerates
// — palette colors and rule tinting. Font stacks, paper-grain texture,
// and component sizes stay constant so a swapped palette can't break
// the editorial grid.

// Names of CSS variables a brand override is allowed to set. Anything
// else in tokens_json is ignored.
const ALLOWED_TOKENS = new Set<string>([
  "--color-cream",
  "--color-cream-warm",
  "--color-navy",
  "--color-navy-deep",
  "--color-navy-soft",
  "--color-gold",
  "--color-gold-soft",
  "--color-gold-light",
  "--color-stone",
  "--color-oxblood",
  "--color-rule-cream",
]);

export type BrandTokens = Record<string, string>;

// Read the active brand override for an event (or null if none) and
// return the filtered token map ready to spread onto a wrapper element's
// inline style.
export function tokensForEvent(brandOverrideId: string | null): BrandTokens {
  if (!brandOverrideId) return {};
  const row = getBrandOverride(brandOverrideId);
  if (!row?.tokens_json) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(row.tokens_json);
  } catch {
    return {};
  }
  // Accept either { tokens: {...} } or a bare object.
  const candidate =
    parsed && typeof parsed === "object" && "tokens" in parsed
      ? (parsed as { tokens?: unknown }).tokens
      : parsed;
  if (!candidate || typeof candidate !== "object") return {};
  const out: BrandTokens = {};
  for (const [k, v] of Object.entries(candidate)) {
    if (typeof v !== "string") continue;
    if (!ALLOWED_TOKENS.has(k)) continue;
    out[k] = v;
  }
  return out;
}
