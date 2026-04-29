# Clubhouse port — migration kickoff

> **Status:** kickoff packet. The artifacts in this folder describe how to
> port the Golf-Trip standalone app into the playclubhouse repo as the
> Events feature, per `docs/PLAN-B-clubhouse-integration.md` (Option 1,
> tight integration). Nothing here executes the port — that has to
> happen on the playclubhouse side, where this AI doesn't have access.

## What's here

| File | Purpose |
|---|---|
| `README.md` | This file — read first. |
| `PORT-MAP.md` | File-by-file inventory: lift verbatim / refactor / drop. |
| `SCHEMA-PORT.md` | SQLite → target-DB notes (likely Postgres). Constraints, JSON, idempotency. |
| `COMPONENT-PORT.md` | UI components: which lift, which need restyle to Clubhouse design system. |
| `OPEN-QUESTIONS.md` | Things that need a Clubhouse-side answer before code lands. |
| `LIFT-ORDER.md` | Recommended phase ordering, smallest-first. |

## TL;DR for the Clubhouse engineer

The **scoring math** (`lib/scoring/*.ts`, all of it — match-play, scrambles,
skins, presses, calcutta, handicap allocation) is **pure-functional, zero
DB dependencies**, and lifts verbatim. Tests come with it (vitest, 57
cases). That's the lowest-risk first commit on the Clubhouse side.

The **schema** is SQLite-flavored but every table is straightforward
ANSI SQL plus one or two SQLite-isms (partial unique indexes, integer
booleans, `datetime('now')` defaults). Translation notes in
`SCHEMA-PORT.md`.

The **repo layer** (`lib/repo/*.ts`) wraps `better-sqlite3` synchronous
queries. To port to async (Postgres + Drizzle/Prisma/whatever Clubhouse
uses), every function gets `await`-ified; the queries themselves are
mostly mechanical translations.

The **API routes + page components** under `app/events/[slug]/*` and
`app/api/events/[slug]/*` are coupled to Next.js App Router and the
event-id ALS pattern; they translate cleanly to the same shape if
Clubhouse is also Next.js, otherwise they're a guide for what
operations the feature exposes rather than verbatim ports.

## What this packet *doesn't* do

- It doesn't dictate the Clubhouse repo layout. Where files live,
  what dialect of SQL, which auth provider — those are all
  playclubhouse-side decisions surfaced in `OPEN-QUESTIONS.md`.
- It doesn't include the live N&P data. Migrating event-1 (the actual
  N&P Invitational) is Phase 2 of Plan B, after the Clubhouse-side
  build-out is functional.
- It doesn't ship a tarball. The source is at
  `claude/build-golf-trip-app-iU5wg` on the golf-trip remote; clone
  it for context and reference.
