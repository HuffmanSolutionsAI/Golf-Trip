# PORT-MAP — file-by-file lift inventory

Three categories: **lift** (verbatim or near-verbatim), **refactor**
(change to fit Clubhouse stack), **drop** (Golf-Trip-specific, not
needed in Clubhouse).

## Lift verbatim — pure logic with no env coupling

These files have zero `getDb`, no `server-only`, and depend only on
shared TypeScript types. Drop into Clubhouse with only `@/lib/types`
import paths rewritten.

| File | Bytes | Notes |
|---|---|---|
| `lib/scoring/handicaps.ts` | 44 lines | `roundHandicap` + Day-1 stroke allocation. |
| `lib/scoring/day1.ts` | 97 lines | Match-play net result computation. |
| `lib/scoring/day2.ts` | 75 lines | 2-man scramble pool ranking. |
| `lib/scoring/day3.ts` | 92 lines | 4-man scramble standings + bonus points. |
| `lib/scoring/skins.ts` | 188 lines | Hole-by-hole skins (gross + net + carryover). |
| `lib/scoring/presses.ts` | 87 lines | Press resolution from match state. |
| `lib/scoring/calcutta.ts` | 142 lines | Auction-pool payouts from leaderboard ranks. |
| `lib/scoring/standings.ts` | 71 lines | Tournament leaderboard composition. |
| `lib/formats/registry.ts` | 85 lines | Format descriptors (id, display name, unit, blurb). |
| `lib/scoring/__tests__/*.ts` | 9 files, 57 cases | Vitest. Lift with the modules. |

**Total: ~12 files, ~1,000 lines, fully tested.** Smallest-risk first
PR on Clubhouse side.

## Refactor — DB-coupled, easy to translate

These wrap `better-sqlite3` (sync). Each function becomes `async` in
Postgres land. Query bodies are mostly literal — only `?` placeholder
vs `$1`/`$2`/etc. and `datetime('now')` vs `now()` differ from ANSI.

| File | Lines | Translation effort |
|---|---|---|
| `lib/repo/events.ts` | 59 | Trivial. Includes the AsyncLocalStorage `runWithEvent` pattern that's worth preserving. |
| `lib/repo/players.ts` | 60 | Trivial. |
| `lib/repo/rounds.ts` | 42 | Trivial. |
| `lib/repo/teams` (in players.ts) | — | Trivial. |
| `lib/repo/courses.ts` | 115 | Has a transactional `createCourse` — Clubhouse's Drizzle/Prisma transaction wrapper is the equivalent. |
| `lib/repo/scores.ts` | 156 | Includes the `upsert` patterns — make sure target DB has equivalent (Postgres `ON CONFLICT`, etc.). |
| `lib/repo/standings.ts` | 456 | Heaviest file. Pure aggregation over repo reads. Worth keeping the snapshot pattern. |
| `lib/repo/teeGroups.ts` | 98 | Trivial. |
| `lib/repo/sideBets.ts` | 278 | Trivial; includes calcutta lots upsert. |
| `lib/repo/audit.ts` | 36 | Trivial. |
| `lib/repo/chat.ts` | 50 | Trivial. |

**Pattern to preserve:** `getCurrentEventId()` reads from
`AsyncLocalStorage`. Every repo function calls it as a default; the
Next.js page components wrap their data fetches in `runWithEvent(slug,
…)`. This makes multi-tenancy invisible to repo callers and is the
single most useful pattern in this codebase. Detail in
`OPEN-QUESTIONS.md` if Clubhouse uses a different request-context
model.

## Refactor — Next.js-coupled

These assume Next.js App Router conventions. If Clubhouse is Next.js,
they translate by path; otherwise they describe the operations the
feature exposes.

| Dir | What's in it |
|---|---|
| `app/events/[slug]/page.tsx` | Public event home: hero + schedule + roster. |
| `app/events/[slug]/leaderboard/page.tsx` | Public leaderboard (live SSE). |
| `app/events/[slug]/teams/page.tsx` | Public roster. |
| `app/events/[slug]/wagering/page.tsx` | Public wagering ledger. |
| `app/events/[slug]/day/[n]/page.tsx` | Per-round tee-group list. |
| `app/events/[slug]/day/[n]/matches/[id]/page.tsx` | Singles scorecard. |
| `app/events/[slug]/day/[n]/entries/[id]/page.tsx` | Scramble scorecard. |
| `app/events/[slug]/admin/page.tsx` | Commissioner setup wizard (teams, players, rounds, side bets, branding, roles). |
| `app/events/[slug]/admin/rounds/[roundId]/page.tsx` | Per-round pairings + tee groups. |
| `app/api/events/*` | All event-scoped APIs. ~25 routes. |
| `app/auth/sign-in/`, `app/auth/check-email/`, `app/auth/error/` | Magic-link UX. |
| `app/dashboard/` | Per-user "My Events" hub. |
| `app/api/auth/request`, `app/api/auth/verify` | Magic-link plumbing. |

These should sit under `apps/clubhouse/src/features/events/` (or
wherever Clubhouse puts feature folders). The route shape stays.

## Refactor — auth + sessions

| File | Notes |
|---|---|
| `lib/session.ts` | HMAC-signed cookies + sessions table. **Drop in favor of Clubhouse's auth.** Replace `getCurrentPlayer` and `getCurrentUser` with Clubhouse equivalents. The `findOrCreateUserByEmail` + `autoClaimPlayersForUser` logic ports as-is, just keyed off the Clubhouse user model. |
| `lib/server/magicLink.ts` | Token generation + storage. Drop if Clubhouse already has magic-link login; keep the schema for `event_roles` + auto-claim. |
| `lib/auth/eventPermissions.ts` | `checkCommissioner(slug)` helper. Lifts; `getCurrentUser` source is the only thing that changes. |
| `lib/auth/roles.ts` | `assignRole`/`revokeRole`/`getRole` over `event_roles` table. Trivial port. |
| `middleware.ts` | Public-path whitelist. Probably superseded by Clubhouse's middleware; drop. |

## Drop — Golf-Trip-specific, won't be ported

| Path | Why |
|---|---|
| `app/page.tsx` | N&P's "field is twenty" landing. Clubhouse has its own home. |
| `app/_landing/SignInForm.tsx` | N&P passcode picker. Clubhouse auth handles this. |
| `app/(app)/*` | The N&P-only `/home`, `/day1`, `/teams` routes. After migration, N&P lives at `/events/np-invitational-2026/*` and these top-level routes go away. |
| `app/leaderboard/` | N&P-only big-screen board. Use the event-scoped one. |
| `app/api/session/login/route.ts` | N&P passcode login endpoint. Drop. |
| `db/seed.sql` | N&P-specific seed. Will become the event-1 import in Plan B Phase 2. |
| `db/tee-groups-seed.sql` | Same — N&P pairings. |
| `db/courses-seed.sql` | Worth porting to Clubhouse's course library if Clubhouse models courses. Otherwise, ship as part of the N&P import. |
| `lib/server/reseedDay1.ts` | N&P operational helper. Drop. |
| `lib/server/systemPosts.ts` | N&P chat system messages. Drop or rebuild on Clubhouse's notification primitives. |
| `components/brand/Seal.tsx`, `Lockup.tsx` | N&P branding. Lives only on event-1's Editorial preset. |
| `components/layout/SiteFooter.tsx` | Hardcoded N&P content. Drop. |
| `components/layout/TopNav.tsx` | Hardcoded N&P routes. Replaced by Clubhouse nav. |
| `components/layout/LiveTicker.tsx` | N&P UX flourish. Optional. |

## Brand override layer

`lib/brand/tokens.ts` + the `brand_overrides` table + `events.brand_override_id`
ship as-is. The three seeded presets (Editorial / Volume II, Pebble,
Pinestraw) are JSON token bags applied via CSS custom properties on
the event-scoped layout wrapper. Whatever Clubhouse's theme system is,
this layer either drops in next to it or feeds its tokens. See
`COMPONENT-PORT.md`.

## Realtime (SSE)

`app/api/events/route.ts` + `lib/events.ts` use Node `EventEmitter` +
SSE. Clubhouse very likely has a different transport (websockets,
pusher, etc.). The shape is small:

- Single in-process emitter, events tagged `{ event_id, kind }`.
- Subscribers filter by `event_id`.
- Six change kinds: `hole_scores`, `chat_messages`, `rounds`, `matches`,
  `scramble_entries`, `players`.

Map `emitChange(kind)` calls to Clubhouse's pub-sub primitive; client-
side hook (`lib/client/useLiveRefresh.ts`) translates similarly.
