# OPEN-QUESTIONS — Clubhouse-side decisions blocking the port

Things this kickoff packet can't answer because they live in
playclubhouse, not here. Each one has a recommended default and
notes on the trade-off; the Clubhouse engineer picks based on local
context.

## 1. Web framework

**Question:** Is playclubhouse Next.js (App Router)? If yes, the page
+ API routes port by path; if no, they're a guide for what to build,
not direct copies.

**Default if Next.js:** drop pages under `apps/clubhouse/src/app/events/[slug]/*`
and APIs under `apps/clubhouse/src/app/api/events/[slug]/*`.

**Default if not:** treat the routes as feature spec; build native
analogs in Clubhouse's framework.

## 2. Database

**Question:** Postgres? Drizzle / Prisma / Knex / raw `pg`?

**Default:** Postgres + whichever ORM Clubhouse already uses. SQL
ports cleanly per `SCHEMA-PORT.md`. The repo layer becomes async.

## 3. Realtime transport

**Question:** Websockets, pusher, Supabase realtime, plain SSE, or
something else?

**Mapping:** the Golf-Trip change bus emits 6 kinds (`hole_scores`,
`chat_messages`, `rounds`, `matches`, `scramble_entries`, `players`)
each tagged with an `event_id`. Subscribers filter by event. Map to
Clubhouse's pub-sub channels — channel name `events:<event_id>` is
the natural shape.

## 4. Auth provider

**Question:** Clerk / NextAuth / custom? Magic-link already wired?

**What we need:**
- A way to know the active user at request time.
- A user model with at least `{id, email}`.
- A way to issue a magic-link sign-in (or skip — Clubhouse may have
  its own login UX).

**Once those three exist**, our `event_roles` table + `assignRole` /
`getRole` / `checkCommissioner` logic ports cleanly. The
`autoClaimPlayersForUser` logic — when a Clubhouse user signs in,
link any `players.email` rows that match — is the most useful piece
to keep.

## 5. Course library

**Question:** Does Clubhouse already model courses with par /
handicap_index per hole / slope+rating per tee box? If yes, our
`courses` + `course_holes` + `course_tee_boxes` tables go away and
events reference Clubhouse's course objects. If no, our 3-table
library lifts as a contribution to Clubhouse.

**Default:** check first, contribute if not present. The seed data
(Pinewild Magnolia / Talamore / Hyland) ports either way.

## 6. Request-scoped event id

We use `AsyncLocalStorage` from `node:async_hooks`. Page components
wrap their data fetches in `runWithEvent(slug, …)`; every repo call
inside reads the active event id from the ALS scope. This makes
multi-tenancy invisible to repo callers.

**Question:** Does Clubhouse have a request-context primitive
already?

**Defaults:**
- Next.js + Node runtime: keep ALS verbatim.
- Edge runtime: ALS isn't reliably available; pass `eventId` as an
  explicit parameter on repo functions instead. Bigger refactor but
  works everywhere.
- Already has a request-context store (e.g. via middleware):
  re-implement `getCurrentEventId()` to read from it.

The pattern is the most useful design decision in this codebase.
Worth preserving the *interface* even if the implementation
mechanism differs.

## 7. Brand documents

**Question:** Where in the playclubhouse repo are the canonical brand
documents (palette tokens, type scale, voice + tone, logo lockups)?
Plan B is explicit that **those win** wherever this app's Volume II
look conflicts with Clubhouse defaults.

**What this changes:**
- The default app look in Clubhouse is **not** Volume II — it's
  whatever Clubhouse's brand docs say.
- Volume II ships only as the first **brand preset**, opt-in per
  event.
- Components that hardcode N&P-specific colors / fonts / chrome
  (Seal, Lockup, SiteFooter, TopNav, the leaderboard's gold rules)
  either drop or move into the Volume II preset bundle.

Without seeing the brand docs, this packet can't tell you exactly
which classes to swap. Once they're identified, `COMPONENT-PORT.md`'s
"lift-and-restyle" instructions are concrete.

## 8. File storage for wordmark uploads

The plan calls for per-event wordmark images. Schema field exists
(`brand_overrides.wordmark TEXT`) but no upload UI ships. When
Clubhouse adds it, plug into Clubhouse's file storage (S3, Cloudinary,
etc.).

**Default:** defer.

## 9. Custom domains per event

Plan B mentions vanity domains (`np2026.example.com` →
`clubhouse.app/events/np-invitational-2026`). Out of scope for the
port; needs DNS infra.

**Default:** defer.

## 10. Testing

We use **vitest**. 57 cases, all in `lib/scoring/__tests__/*`. They're
pure-function tests that lift verbatim alongside the scoring modules.

**Question:** Does Clubhouse use vitest? Jest? Bun's test runner?

**Default:** if not vitest, the test bodies are framework-agnostic
(`describe` + `it` + `expect`) — translate by find/replace.

## 11. Repo layout

Where does this feature live in playclubhouse?

**Suggestion:** `apps/clubhouse/src/features/events/` for the feature
folder; the standard `app/events/[slug]/*` and `app/api/events/[slug]/*`
for routes if Clubhouse is monorepo'd that way.

If playclubhouse uses domain-driven feature folders, consult
existing convention.

## 12. Migration of the live N&P data

Plan B Phase 2 says: import N&P as the first event, point N&P's brand
to Volume II preset, redirect `np.huffmanai.com` to the new URL.

**Out of scope for the port commit set** — that's the cutover step
after Clubhouse-side build-out is functional. The migration script
is straightforward (read N&P SQLite DB, write to Clubhouse Postgres
with new IDs), but it sits at the end of the sequence.

The `np.huffmanai.com` Cloudflare Tunnel currently points at the Mac
mini. The cutover changes the upstream; it doesn't need code on this
side.
