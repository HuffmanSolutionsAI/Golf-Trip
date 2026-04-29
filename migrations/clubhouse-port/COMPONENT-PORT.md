# COMPONENT-PORT — UI lift inventory

The Golf-Trip app is built on Tailwind v4 + a hand-rolled "Volume II"
editorial design language (DM Serif Display Italic + Tinos + Inter +
JetBrains Mono, paper-grain texture, gold rules, midnight-oak palette).

Per Plan B §3, the **default look in Clubhouse is Clubhouse** — not
the Volume II editorial aesthetic. Volume II ships as the first
brand-override preset (`brand-editorial-v2`) so the N&P Invitational
keeps its identity inside Clubhouse, but every other event uses
Clubhouse's design system.

That changes how we lift components.

## Two categories

**Lift the data shapes; restyle the markup.** Most components are
trivial JSX over typed data. The shape is portable; the styles
aren't.

**Lift verbatim into a "Volume II" preset.** A few components *are*
the Volume II look (Seal, Lockup, the editorial rule tints). They
ship as a CSS-token-driven brand preset, scoped to events that opt
into it, instead of as project-default chrome.

## Per-component map

### Score-entry (high-value, lift-and-restyle)

| File | Notes |
|---|---|
| `app/(app)/day1/matches/[id]/MatchScorecard.tsx` | Singles match scorecard. Live SSE refresh, hole-entry sheet, stroke allocation display. The data model + state machine is the value; restyle the buttons + grid. |
| `components/scoring/ScrambleScorecard.tsx` | Used by both Day 2 (pool) and Day 3 (team) modes via a `mode` prop. Same logic-vs-style split. |
| `components/scoring/HoleEntrySheet.tsx` (if present) | Single-hole entry sheet. Mobile-first input pattern worth preserving. |

These are mobile-primary scoring surfaces — keep the touch targets
generous. The interaction *flow* (tap hole → enter strokes → next
hole) is good; restyle to match Clubhouse.

### Public read views (lift-and-restyle)

| Page | Notes |
|---|---|
| `app/events/[slug]/page.tsx` | Event home. Hero + schedule + roster. |
| `app/events/[slug]/leaderboard/page.tsx` | Leaderboard with Overall + per-day tabs. |
| `app/events/[slug]/teams/page.tsx` | Public roster. |
| `app/events/[slug]/wagering/page.tsx` | Bets ledger. |
| `app/events/[slug]/day/[n]/page.tsx` | Tee-group list per round. |
| `app/leaderboard/LeaderboardView.tsx` | Heavy lifter: tab UI, mobile/desktop responsive grid, projected-points indicator. The columns + sort logic are the value. |

### Admin / setup wizard (lift-and-restyle)

| Page | Notes |
|---|---|
| `app/events/[slug]/admin/page.tsx` | The full setup wizard. Sections: Teams, Players, Rounds, Side bets, Branding, Co-commissioners. ~700 lines but mostly composing AdminForms.tsx. |
| `app/events/[slug]/admin/AdminForms.tsx` | All the inline edit/create form components. |
| `app/events/[slug]/admin/SideBetForms.tsx` | Side-bet specific UI. |
| `app/events/[slug]/admin/rounds/[roundId]/page.tsx` | Per-round pairings + tee-group management. |
| `app/events/[slug]/admin/rounds/[roundId]/RoundAdminForms.tsx` | Form components for that page. |
| `app/dashboard/page.tsx` | "My events" hub. |
| `app/dashboard/new-event/NewEventForm.tsx` + page | Event creation form. |

The form pattern is "row → click Edit → row turns into form with
Save/Cancel". It's tight; worth preserving the interaction. Restyle
the input chrome to Clubhouse.

### Auth UI (drop most, port the auto-claim logic)

| File | Decision |
|---|---|
| `app/auth/sign-in/page.tsx` + `SignInForm.tsx` | Drop if Clubhouse has its own auth UI. |
| `app/auth/check-email/page.tsx` | Drop. |
| `app/auth/error/page.tsx` | Drop. |
| `app/api/auth/request/route.ts`, `app/api/auth/verify/route.ts` | Drop if Clubhouse handles magic links. **Keep** the `autoClaimPlayersForUser` logic from `lib/session.ts` — that's the part that ties player-roster emails to Clubhouse user accounts. |

### N&P-specific chrome (drop)

These are the Volume II editorial chrome elements. They ship as a
**brand preset** in Clubhouse, not as project-default components.

| File | Where it goes |
|---|---|
| `components/brand/Seal.tsx` | Volume II preset asset. |
| `components/brand/Lockup.tsx` | Volume II preset asset. |
| `components/layout/SiteFooter.tsx` | Volume II preset (hardcoded N&P content; rewrite as brand-driven). |
| `components/layout/TopNav.tsx` | Drop. Clubhouse has its own nav. |
| `components/layout/LiveTicker.tsx` | Optional. Live-feed UX flourish; reproduce on Clubhouse's notification primitives if useful. |
| `app/page.tsx` (root landing) | Drop. |
| `app/_landing/SignInForm.tsx` | Drop. |
| `app/(app)/layout.tsx` | Drop (it's the N&P top nav wrapper). |
| `app/leaderboard/layout.tsx` | Drop (Clubhouse layout takes over). |
| `app/(app)/admin/*` | Drop. The N&P admin tabs have been superseded by `/events/[slug]/admin`. |
| `app/(app)/format/page.tsx`, `app/(app)/schedule/page.tsx`, `app/(app)/teams/page.tsx`, `app/(app)/teams/[id]/page.tsx`, `app/(app)/players/[id]/page.tsx`, `app/(app)/home/page.tsx` | All N&P-specific top-level routes. After migration N&P is at `/events/np-invitational-2026/*` and these vanish. |

## Tailwind config + globals.css

| File | Treatment |
|---|---|
| `app/globals.css` | The Midnight Oak palette + paper-grain + font definitions live here. **Lift only into the Volume II brand preset** — don't make it project-default. The `--color-*` variables become preset tokens (already what `db/event-seed.sql` does). |
| `tailwind.config.*` | Lift any custom utilities (paper-grain background, rule-gold, eyebrow). |
| `next/font` setup (in `app/layout.tsx`) | DM Serif + Tinos + Inter + JetBrains Mono. Move to the Volume II preset; Clubhouse has its own type stack. |

## Brand-override layer

This is what makes Volume II shippable as a per-event preset rather
than project chrome:

- `lib/brand/tokens.ts` — whitelist + parse + format CSS-vars.
- `app/events/[slug]/layout.tsx` — applies tokens onto the wrapper
  div via inline style; cascade does the rest.
- `db/event-seed.sql` — three preset rows in `brand_overrides`.

In Clubhouse this becomes "events can opt into a non-default theme".
Whatever Clubhouse's theming primitive is, this layer either drops
in next to it or feeds its tokens.

## Mobile / responsive notes

The leaderboard `Overall` tab is intentionally collapsed to a 3-column
grid on mobile (Pos / Team / Pts) with per-day breakdown rendered as a
small mono line under the team name — this was a real bug we fixed.
Keep that pattern when restyling. See commit `4556ba2`.

## What lift-and-restyle means in practice

1. Copy the page or component file into Clubhouse's tree.
2. Strip Tailwind v4 `@theme` references that don't exist in Clubhouse.
3. Replace inline `style={{ fontSize: 18, color: "var(--color-navy)" }}`
   with Clubhouse's typography + color tokens.
4. Keep the JSX structure, the conditional logic, the data flow.
5. Diff against the original to make sure no logic was lost in the
   restyle.

The Volume II preset is the *one* exception — that ships verbatim and
gets activated per-event via the brand override picker.
