# LIFT-ORDER — recommended phase ordering

Smallest-risk first. Each phase is an independent PR on the
playclubhouse side. Don't sequence them as one giant PR — the value of
this codebase is the *pieces*, and each piece is easy to review on
its own.

## Phase 1 — pure scoring math (independent, ~1 day)

**What:** lift `lib/scoring/*.ts` and `lib/scoring/__tests__/*.ts`
verbatim.

**Where:** `apps/clubhouse/src/features/events/scoring/` (or
wherever scoring logic belongs in Clubhouse's tree).

**Why first:** zero DB coupling, zero framework coupling, 57 tests
catch any regressions immediately. Validates the type-import path
rewrites without touching anything else.

**Deps:** ports `lib/types.ts` partial (just the row-type interfaces
the scoring modules need: `HoleRow`, `PlayerRow`, `Day1MatchStateRow`,
etc.). These can be hand-typed in Clubhouse from the schema.

**Done when:** vitest passes 57/57 in Clubhouse's test runner.

## Phase 2 — schema + multi-tenancy (independent, ~1-2 days)

**What:** translate the schema to Clubhouse's DB tooling. Implement
the `runWithEvent` / `getCurrentEventId` pattern using Clubhouse's
request-context primitive (or `AsyncLocalStorage` if Node).

**Why next:** every other piece depends on it.

**Done when:** `events`, `users`, `event_roles`, `teams`, `players`,
`rounds`, `holes`, `matches`, `scramble_entries`, `scramble_participants`,
`hole_scores`, `tee_groups`, `tee_group_matches`, `tee_group_entries`,
`audit_log`, `chat_messages`, `courses`, `course_holes`,
`course_tee_boxes`, `side_bets`, `side_bet_entries`, `side_bet_payouts`,
`side_bet_calcutta_lots`, `brand_overrides` exist with the right
constraints. Sequenced migration scripts; production already has zero
rows so backfilling is irrelevant for empty Clubhouse.

## Phase 3 — repo layer (1-2 days)

**What:** port `lib/repo/*.ts` files. Each one is a near-mechanical
async-ification of the queries.

**Done when:** every repo function has a Clubhouse-side equivalent and
returns the same shape.

## Phase 4 — read-only event surfaces (~1-2 days)

**What:** the public pages — `/events/[slug]`, `/events/[slug]/leaderboard`,
`/events/[slug]/teams`, `/events/[slug]/wagering`,
`/events/[slug]/day/[n]`. Plus the readonly-style scorecard pages.

**Why now:** these don't write data; they exercise the repo layer
end-to-end and surface any porting bugs.

**Restyle:** to Clubhouse's design system per `COMPONENT-PORT.md`.

**Done when:** an event with seeded data renders correctly at every
public URL.

## Phase 5 — auth + roles + invites (~2-3 days)

**What:**
- Connect Clubhouse's existing auth to the event-id resolution layer.
- Port `event_roles` + `assignRole` / `revokeRole` / `getRole` / `checkCommissioner`.
- Port the auto-claim logic: when a Clubhouse user signs in, any
  `players.email` matches get linked to that user's account.
- Magic-link request/verify only if Clubhouse doesn't already have it.

**Done when:** a fresh Clubhouse user can be granted commissioner /
scorer / player on an event, and signing in carries those grants.

## Phase 6 — write APIs (~3-4 days)

**What:** the commissioner-side write endpoints — create/edit/delete
events, teams, players, rounds, matches, scramble entries (auto-fill),
tee groups, scorers, side bets, calcutta lots, role grants, brand
overrides. Total ~25 routes under `app/api/events/[slug]/*`.

**Restyle:** the bodies + auth gating port verbatim. Only the
transport (Next.js Route Handler vs Clubhouse's API convention) and
the Zod-vs-Clubhouse-validation choice differ.

**Done when:** every operation in the original `app/api/events/[slug]/*`
has a Clubhouse equivalent.

## Phase 7 — admin UI / setup wizard (~3-4 days)

**What:** the admin pages and forms — `/events/[slug]/admin/*`. The
biggest UI surface in this codebase but mechanically straightforward
once the APIs are in place.

**Restyle:** every form input chrome → Clubhouse's design system. The
layout flow + field validation logic ports as-is.

**Done when:** a commissioner can stand up a full event end-to-end
(create event → roster → rounds → pairings/auto-fill → tee groups → side
bets) entirely in Clubhouse.

## Phase 8 — score-entry UX (~2-3 days)

**What:** mobile-first scorecards. `MatchScorecard.tsx` (singles) and
`ScrambleScorecard.tsx` (pair + team modes).

**Restyle:** input chrome + sheet UI.

**Done when:** designated scorers can enter scores from their phones,
SSE/realtime updates the leaderboard live for spectators.

## Phase 9 — realtime transport (~1-2 days)

**What:** map `emitChange(kind, eventId)` to Clubhouse's pub-sub.
Wire client-side subscriptions (`useLiveRefresh`) to whatever
listener primitive Clubhouse provides.

**Why late:** the rest of the app works without it (just no live
updates). Adding it last lets you validate everything else first.

**Done when:** scoring on one device reflects in the leaderboard on
another within a few seconds.

## Phase 10 — branding presets (~1 day)

**What:** `brand_overrides` table + `lib/brand/tokens.ts` + the three
seeded presets + the per-event picker UI.

**Why:** small surface, but it's the bridge that lets N&P run inside
Clubhouse with its own visual identity. Without this, the cutover
in Phase 11 looks wrong.

**Done when:** the Branding section in admin lets a commissioner pick
a preset and the event-scoped layout reflects the swap.

## Phase 11 — N&P data import + cutover (~1 day)

**What:**
- One-shot script: read the live N&P SQLite DB on the Mac mini, write
  every row into Clubhouse's Postgres with the right IDs.
- Activate the Volume II brand preset on the imported `np-invitational-2026`
  event.
- Update `np.huffmanai.com` Cloudflare Tunnel target to point at
  Clubhouse instead of the Mac mini (or set up the redirect to
  `clubhouse.app/events/np-invitational-2026`).
- Archive the standalone Golf-Trip repo (read-only).

**Why last:** the live event has live users; only do the cutover
after the destination is fully built and tested with synthetic data.

**Done when:** `np.huffmanai.com` resolves to the Clubhouse-hosted
event and looks identical (Volume II preset).

## Sequencing notes

- **1 → 2 → 3 → 4** in order. Skip ahead and you'll waste effort
  on UI built against a half-finished repo layer.
- **5 + 6** can be parallelized (different engineers).
- **7, 8, 10** can be parallelized after **6**.
- **9** can land any time after **3** but feels best as polish near
  the end.
- **11** is the cutover. Don't do it until the rest is green.

## Rough total

If a single engineer does it linearly: **~3 weeks of focused work**.
With 2-3 engineers parallelizing 5/6/7: **~1.5-2 weeks**.

Most of that is the UI restyle, not the porting.
