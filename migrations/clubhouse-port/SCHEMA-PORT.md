# SCHEMA-PORT — translating the Golf-Trip SQLite schema

The schema lives in `db/schema.sql`. It's idempotent (`CREATE TABLE IF
NOT EXISTS`, applied on every boot). When porting to Clubhouse's DB
(presumed Postgres), most of it is mechanical; a handful of SQLite-isms
need explicit attention.

## Tables to port

In dependency order:

1. **`events`** — top-level container.
2. **`brand_overrides`** — palette presets (referenced by `events.brand_override_id`).
3. **`teams`** — per-event teams.
4. **`users`** — auth identities (one per email).
5. **`players`** — per-event players. May reference a `users` row via `user_id`.
6. **`event_roles`** — `(event_id, user_id, role)` grants.
7. **`magic_link_tokens`** — short-lived, hashed. Probably *drop* if Clubhouse already has magic-link auth; keep `event_roles` and `users.id` mapping.
8. **`sessions`** — drop in favor of Clubhouse's auth.
9. **`courses`** + **`course_holes`** + **`course_tee_boxes`** — course library.
10. **`rounds`** — per-event rounds.
11. **`holes`** — per-round hole snapshot.
12. **`matches`** — singles match-play pairings.
13. **`scramble_entries`** + **`scramble_participants`** — scramble round entries.
14. **`hole_scores`** — the score data.
15. **`tee_groups`** + **`tee_group_matches`** + **`tee_group_entries`** — tee-time groupings.
16. **`audit_log`** — write-only audit trail.
17. **`chat_messages`** — per-event chat (system + human).
18. **`side_bets`** + **`side_bet_entries`** + **`side_bet_payouts`** + **`side_bet_calcutta_lots`** — wagering ledger.

## SQLite-isms to translate

### `INTEGER` booleans → real `BOOLEAN`
Several columns store `0`/`1` for booleans (`players.is_admin`,
`rounds.is_locked`). Translate to `BOOLEAN`. Update the TS row types
in `lib/types.ts` (`is_admin: number` → `boolean`) and any code that
treats them as numbers.

### `datetime('now')` defaults → `now()`
Every `*_at` column has `DEFAULT (datetime('now'))`. Postgres equivalent:
`DEFAULT now()` or `CURRENT_TIMESTAMP`. Type becomes `TIMESTAMPTZ`.

### `TEXT` PKs vs UUID
We use `TEXT PRIMARY KEY` with prefixed app-generated IDs (`p-…`,
`team-…`, `rnd-…`). Two paths:

1. **Keep app-generated TEXT IDs.** Cleanest if Clubhouse already has
   a convention. `genId(prefix)` in `lib/db.ts` maps to whatever
   helper Clubhouse uses; the prefix scheme is a debugging
   nicety, not a correctness requirement.
2. **Switch to `UUID DEFAULT gen_random_uuid()`.** Clean Postgres-
   native pattern. Means giving up the prefix-by-table debugging cue;
   a fast trade.

Either works. Keep one project-wide.

### `CHECK` constraints with multi-column XOR
Three tables use `CHECK ((a IS NOT NULL) + (b IS NOT NULL) = 1)` to
enforce "exactly one of a or b is set":

- `hole_scores`: `player_id` XOR `scramble_entry_id`
- `sessions`: `player_id` XOR `user_id`
- `side_bet_entries`: `player_id` XOR `team_id`
- `side_bet_payouts`: `recipient_player_id` XOR `recipient_team_id`

Postgres: same syntax works. Drizzle / Prisma may need the constraint
declared via raw SQL.

### Partial UNIQUE indexes
Used in two places:

```sql
CREATE UNIQUE INDEX hole_scores_player_round_hole_unique
  ON hole_scores (player_id, round_id, hole_number)
  WHERE player_id IS NOT NULL;
```

Postgres supports this verbatim. Same for `side_bet_entries_*_unique`.

### Foreign key cascade behavior
The schema relies on `ON DELETE CASCADE` for descendant tables
(holes / matches / scramble_entries from rounds; tee_group_*; side_bet_*).
Postgres FKs behave the same way. Keep the cascades — `lib/repo/`
delete handlers depend on them.

### `WITHOUT ROWID` / `STRICT`
Not used. Nothing to translate.

### `INSERT OR IGNORE`
Used heavily in seed files. Postgres equivalent: `INSERT … ON CONFLICT DO NOTHING`.

### `INSERT OR REPLACE` / upserts
A few repo functions do upsert via existence-check + UPDATE/INSERT
(see `lib/repo/scores.ts`, `lib/repo/sideBets.ts`'s `upsertLot`). For
Postgres, replace with `INSERT … ON CONFLICT … DO UPDATE`.

## Idempotent boot pattern

`lib/db.ts` runs on every server start:
1. `db.exec(schema.sql)` — `CREATE TABLE IF NOT EXISTS` only.
2. `event-seed.sql` — bootstraps the canonical event-1 row.
3. `ensureColumn` migrations for legacy DB upgrades.
4. Conditional table rebuilds (sessions, rounds — see legacy
   migrations there).
5. `courses-seed.sql` — populate canonical courses.
6. `seed.sql` (only when teams empty) — N&P-specific.
7. `tee-groups-seed.sql` — N&P pairings; idempotent DELETE+INSERT.

For Clubhouse:
- The `CREATE TABLE IF NOT EXISTS` pattern is fine in Postgres; **but**
  Clubhouse likely has a real migration tool (Drizzle Kit / Prisma /
  Knex). Express the table set as a migration, not boot-time DDL.
- The seed/ensureColumn/rebuild logic is Golf-Trip's homegrown
  migration approach for SQLite without a tool. Translate to whatever
  Clubhouse uses; the *content* (which columns / which constraints)
  ports cleanly.

## Multi-tenancy column

Top-level rows carry `event_id` (teams, players, rounds,
chat_messages, audit_log) with a default of `'event-1'` for legacy
backfill. In Clubhouse, every event-scoped query uses
`AsyncLocalStorage` to thread the active event ID — see
`lib/repo/events.ts` `getCurrentEventId()`. If Clubhouse uses
something different (request-scoped store, middleware-set context,
a per-call `eventId` parameter), the *pattern* still applies; the
*mechanism* is replaceable.

## Schema "must-haves" that are easy to lose

These are the constraints/indexes that exist for correctness, not
just performance. Keep them in the port:

- `UNIQUE(event_id, day)` on rounds (Phase 3c rebuild).
- `UNIQUE(team_id, team_slot)` on players.
- `UNIQUE(round_id, match_number)` on matches.
- `CHECK (player1_id <> player2_id)` on matches.
- `CHECK (strokes BETWEEN 1 AND 15)` on hole_scores.
- The XOR `CHECK`s noted above.
- The partial UNIQUE indexes for `hole_scores_*` and
  `side_bet_entries_*`.
- All `ON DELETE CASCADE`s — `lib/repo/` delete handlers assume them.

Lose any of these and the app silently corrupts data.
