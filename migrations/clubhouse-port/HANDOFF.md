# HANDOFF — for the playclubhouse engineer

You've been handed a zip of the Golf-Trip standalone app
(`claude/build-golf-trip-app-iU5wg` branch). This file tells you what
to do with it.

## What's in the zip

A complete, runnable Next.js 15 + SQLite app — the live N&P
Invitational scoring app, generalized into a multi-event engine over
Plan A's six phases. Plus this migration packet.

Excluded (recreate / not needed):
- `node_modules/` → run `pnpm install`.
- `.next/` → produced by `pnpm build` or `pnpm dev`.
- `data/*.db*` → local SQLite, regenerated on first boot by `pnpm db:init`.

Included:
- All source (`app/`, `lib/`, `components/`, `db/`, `scripts/`).
- Full `.git` history with phase-by-phase commits — read the log to
  see how the codebase grew.
- 57-case vitest suite under `lib/scoring/__tests__/`.
- This migration packet at `migrations/clubhouse-port/`.

## First things to read (in order)

1. **`docs/PLAN-A-event-engine.md`** — the architecture spec. What
   the app *is*. Read this before the migration plan or the
   migration plan won't make sense.
2. **`docs/PLAN-B-clubhouse-integration.md`** — the migration spec.
   Plan B Option 1: tight integration into Clubhouse, Volume II as
   a brand preset, defer to playclubhouse brand docs.
3. **`migrations/clubhouse-port/README.md`** — entry point for the
   port packet.
4. **`migrations/clubhouse-port/OPEN-QUESTIONS.md`** — 12 things
   that need decisions on your side. Answer these before you start
   coding. Many of them are about Clubhouse's existing stack
   (framework? DB? auth? realtime?).
5. **`migrations/clubhouse-port/LIFT-ORDER.md`** — 11 phases in
   dependency order. Smallest-first. Probably ~3 weeks solo or
   1.5-2 weeks parallelized.
6. **`migrations/clubhouse-port/PORT-MAP.md`**,
   **`SCHEMA-PORT.md`**, **`COMPONENT-PORT.md`** — per-area detail.
   Reference, not sequential.

## Run it locally before you port anything

You'll port more confidently if you've used the app yourself. Five
minutes:

```bash
unzip golf-trip-handoff.zip
cd Golf-Trip   # or whatever the unzip dir is named

pnpm install
pnpm db:init   # builds ./data/invitational.db with full N&P seed
echo 'SESSION_SECRET=any-32-char-random-string-here-please' > .env.local
pnpm dev       # http://localhost:3000
```

The N&P passcode-login surface is at `/`. The new event-engine
surface is at `/dashboard` (sign in via magic link at
`/auth/sign-in` — emails log to stderr in dev). Walk through:
sign in → create event → set up roster → add a round → add a side
bet → settle. Then check `/events/event-1/leaderboard` to see what
N&P looks like.

## Recommended first PR on the playclubhouse side

Phase 1 from `LIFT-ORDER.md`: lift `lib/scoring/*.ts` and its
`__tests__/` directory verbatim. Pure functions, zero DB coupling, 57
tests. About a half-day's work and validates your type-import path
rewrites without touching anything else.

After that, `OPEN-QUESTIONS.md` answers will determine the order of
the next moves.

## Things this engineer will probably want to ask

- "Where do I put it in playclubhouse?" → see `OPEN-QUESTIONS.md` §11.
- "What about the schema?" → `SCHEMA-PORT.md` covers all the SQLite-
  to-Postgres translation points.
- "Does this assume Next.js?" → Most page files do; the *logic* doesn't.
  See `OPEN-QUESTIONS.md` §1.
- "How do we handle multi-tenancy?" → `AsyncLocalStorage` + a
  `runWithEvent(slug, …)` wrapper at the page boundary.
  `OPEN-QUESTIONS.md` §6 has alternatives if your stack can't do
  ALS.
- "What about the live N&P data?" → That's the cutover step at the
  end of Plan B, after Clubhouse-side build-out is complete. See
  Plan B Phase 2.

## What to skip

- The `lib/server/reseedDay1.ts`, the N&P-specific seed files
  (`db/seed.sql`, `db/tee-groups-seed.sql`), the legacy admin tabs
  in `app/(app)/admin/`, the editorial chrome components (`Seal`,
  `Lockup`, `SiteFooter`, `TopNav`). All called out in
  `PORT-MAP.md` under "Drop".
- The HMAC session + magic-link auth (`lib/session.ts`,
  `lib/server/magicLink.ts`) if Clubhouse already has auth. Keep
  the `event_roles` table + `assignRole`/`getRole` helpers + the
  `autoClaimPlayersForUser` logic from `lib/session.ts` — those
  are the parts that integrate Clubhouse identities with this
  app's per-event roles.

## Questions for the originator (Jordan)

If anything in the migration packet is unclear or contradicts a
decision you've already made on the Clubhouse side, surface it
early. The packet was written without seeing the playclubhouse repo,
so any conflict is fine — your context wins.

Plan B's two non-negotiables are:

1. **Clubhouse's brand documents win.** Not Volume II.
2. **"My Events" / "events"** terminology, not "trips". Internally
   the table is `event` and the route is `/events/<slug>`.

Everything else is movable.
