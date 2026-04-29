# Plan A — Generalize the App into a Multi-Event Golf Engine

> **Goal.** Turn this single-tournament Next.js app (the N&P Invitational) into a
> general-purpose, self-serve **golf event engine**. Anyone can spin up an
> event — any course, any roster, any format — share a public read-only
> leaderboard, and run live scoring from their phone or laptop.

> **Web-only, for now.** Both mobile and desktop are first-class targets; no
> native iOS/Android shell. Mobile-web is the primary scoring surface.

---

## 1. Product principles

1. **Public read-only by default.** Spectators, family, the rest of the
   foursome on the next tee — anyone with the link can watch a leaderboard
   live without an account.
2. **Login gates writes.** Creating an event, configuring it, and entering
   scores all require an authenticated user. Reading does not.
3. **Editorial feel survives.** The Volume II / Midnight Oak layout (DM Serif
   Display Italic + Tinos + Inter + JetBrains Mono, gold rules, paper grain)
   is the *default* presentation. Theming hooks let an organizer swap palette
   and wordmark without breaking layout.
4. **Format pluggability.** Match play, net stroke play, two-man scramble,
   four-man scramble are first-class today. New formats (Stableford, skins,
   Ryder-Cup-style team competitions, Chapman, alt-shot) plug in via a small
   contract.
5. **Wagering is in scope.** Side bets, skins pots, closest-to-pin pots,
   per-hole presses, season-long tallies — all explicit features, not
   afterthoughts.
6. **Commissioner chooses the rules.** Handicap source, scoring rules, who
   can score which group, how ties break — all per-event configuration.

---

## 2. Domain model — what changes

The current schema implicitly assumes one tournament. We pull a single
`event` aggregate over the top of every existing entity.

```
event ──┬── round ──┬── tee_group ──┬── match            (head-to-head formats)
        │           │               └── scramble_entry   (team formats)
        │           └── course (snapshot of ratings/slope at event time)
        ├── player  ──── player_event_membership (handicap, team, role)
        ├── team
        ├── role_grant (commissioner / scorer / player / spectator)
        ├── side_bet  (skins, ctp, presses, custom)
        └── brand_override (palette, wordmark, hero copy)
```

Every existing table grows an `event_id` column; existing data migrates as
"event-1" (the N&P Invitational) so nothing is lost. Lookups become
`WHERE event_id = ? AND ...`.

### 2.1 The `event` row

| field | notes |
|---|---|
| `id` | slug, e.g. `np-invitational-2026` |
| `name` | "N&P Invitational" |
| `subtitle` | "Volume II" |
| `start_date`, `end_date` | bounds rounds |
| `visibility` | `public` (read-only for the world) / `unlisted` / `private` |
| `commissioner_user_id` | owner |
| `handicap_source` | `'manual'` (see §6 — other sources deferred) |
| `brand_override_id` | optional pointer to a `brand_override` |
| `created_at`, `updated_at` | |

### 2.2 Roles per event

A user has one of: `commissioner`, `scorer`, `player`, `spectator`. Spectator
is implicit for public events (no account required). Scorer assignment lives
on `tee_group.scorer_player_id` exactly as it does today; we just look it up
inside an event.

---

## 3. Format plugin contract

Formats are the heart of the app. We expose a minimal interface so a new
format ships as one file:

```ts
type FormatPlugin = {
  id: string;                      // 'match-play-net' | 'two-man-scramble' | ...
  display_name: string;
  unit: 'individual' | 'pair' | 'team';
  setup: (round: Round) => Promise<void>;     // creates matches/entries/pairings
  scoreSchema: z.ZodSchema;                   // shape of a per-hole score doc
  scoreEntry: ReactComponent;                 // the input UI on /round/[id]
  computeStandings: (round: Round) => Standing[]; // driver of leaderboards
};
```

The existing files become reference implementations:

| existing | becomes |
|---|---|
| `lib/scoring/day1.ts` (match play, net) | `formats/match-play-net.ts` |
| `lib/scoring/day2.ts` (2-man scramble pool) | `formats/scramble-pair.ts` |
| `lib/scoring/day3.ts` (4-man scramble) | `formats/scramble-team.ts` |

A registry (`formats/index.ts`) lets the round configuration page render
"Format: [dropdown of registered plugins]". Adding Stableford is one new
file plus an entry in the registry.

---

## 4. Course library

Today the course is hard-coded per round (`Pinewild`, `Talamore`, `Hyland`).
We extract a **course library**:

- `course` table — name, par per hole, slope/rating per tee box, optional
  hole metadata (yardage, hole names).
- `course_tee_box` — championship/men's/senior/forward/etc.
- A round references `course_id` + `tee_box_id`; we **snapshot** ratings
  onto the round at event time so future course-rating changes don't
  retroactively rewrite handicaps.

Bootstrapping: ship a small library of public-domain courses (Pinehurst
sandbox courses, the few we already model) and let commissioners CRUD their
own. Course creation is in scope but lightweight — par + tee box ratings is
enough to score; hole-by-hole yardage is optional polish.

---

## 5. Roster & teams

- A **player** is a person at the event. Identified by name + optional
  email. Email lets them claim the player on login (auto-link via the
  magic-link flow).
- **Teams** are optional and per-event. Match play wants a 1-v-1 grid;
  scrambles want pairs/foursomes; an open stroke-play event has no teams at
  all.
- **Slots** (A/B/C/D) we keep as an opt-in convenience for events that pair
  by slot like ours does. Commissioner can disable slots entirely.

CSV import for rosters: name, email, handicap, team, slot — paste a
spreadsheet, parse to draft, confirm to commit.

---

## 6. Handicap source — manual

Handicaps are entered manually by the commissioner (or self-reported on
the player roster). That's the only source we ship.

Live syncing from a handicap provider (GHIN, WHS) was in the original
plan but is **deferred indefinitely** — there is no documented public
GHIN API, the unofficial endpoints sit in TOS-grey territory, and the
USGA partner program isn't realistic for a self-hosted event engine.
We'll revisit if a clean integration path opens up. For events that
need authoritative indices today, the commissioner can copy them from
the source of truth (their club's handicap report) into the manual
field.

Round-level handicap math (course handicap = index × slope ÷ 113 +
course rating − par) is centralized in `lib/scoring/handicaps.ts` and
treats `players.handicap` as the input, regardless of how the number
got there.

The `events.handicap_source` column exists in the schema for forward
compatibility; today every row is `'manual'` and there's no UI to
change it.

---

## 7. Wagering & side bets

Wagering is a first-class module, not a footnote. Initial scope:

- **Skins** — per round; carryover; gross or net; per-hole resolution.
- **Closest to pin / Long drive** — per hole; commissioner enters winner.
- **Presses** — per match (Day-1-style head-to-heads).
- **Calcutta / auction pools** — players bid on teams pre-event; payouts
  follow final standings.
- **Custom side bets** — free-form bet with a name, a buy-in, a list of
  participants, and a "settle" button the commissioner uses post-round.

Storage:

```
side_bet         (id, event_id, type, name, rules_json, buy_in_cents, status)
side_bet_entry   (side_bet_id, player_id_or_team_id, position)
side_bet_payout  (side_bet_id, recipient_player_id, amount_cents, note)
```

The leaderboard grows a "Wagering" tab summarizing current pots and
settlements. We never touch real money — this is a ledger, not Stripe.
(Stripe-backed buy-ins is a credible later phase but not in v1.)

---

## 8. Auth & permissions

- Public reads: no account.
- Writes: passwordless email magic link (Resend or Postmark). Sessions
  are HMAC-SHA256 cookies, same shape we already use.
- Roles per event:
  - **Commissioner** — full CRUD on the event, assigns scorers, settles
    side bets.
  - **Scorer** — write access to the rounds/groups they're designated on
    (existing model).
  - **Player** — can claim their own player row, view scoring as
    read-only.
  - **Spectator** — implicit; read only.

The current per-tee-group `scorer_player_id` model carries forward
unchanged. Commissioners override scorer per group.

---

## 9. Branding per event

- Default: Midnight Oak palette + DM Serif / Tinos / Inter / JetBrains
  type stack + paper grain. The app *looks editorial out of the box*.
- Optional `brand_override`: palette tokens, wordmark image, hero subtitle,
  optional custom domain (CNAME → `event-id.<our-domain>`).
- Branding is layout-stable: overrides feed Tailwind v4 `@theme` tokens, so
  a custom palette can't break the grid or the typography hierarchy.

Two preset palettes ship in addition to Midnight Oak so non-designers can
pick a vibe without thinking: e.g. "Pebble" (blue/sand) and "Augusta-ish"
(green/cream). Trademark-safe, obviously.

---

## 10. Public surfaces

A public event URL exposes:

- `/<event>` — event home (hero, dates, teams, sponsors)
- `/<event>/leaderboard` — overall + per-day, live via SSE
- `/<event>/day/[n]` — per-round group/match list
- `/<event>/wagering` — side-bet ledger
- `/<event>/players` — roster

Commissioner surfaces (`/<event>/admin/*`) require login + commissioner
role. Score-entry surfaces (`/<event>/score/...`) require login + scorer
or commissioner role.

Everything renders responsively. Mobile is the primary surface for
scoring; desktop is the primary surface for setup and the big-screen
leaderboard.

---

## 11. Data isolation & multi-tenancy

- Every row that's currently event-implicit gains an `event_id`.
- All repo functions (`lib/repo/*`) take an `event_id` (or derive it from
  the request context via Next.js dynamic params).
- The SSE channel becomes `events:<event_id>` so two events streaming at
  once don't bleed.
- `db:reset` becomes `event:reset <event-id>` (with a `--all` for tests).

A tenant boundary inside one SQLite database is enough for v1. If we
outgrow it, we split per-event databases — but the `event_id` discipline
makes that a refactor, not a rewrite.

---

## 12. Migration of the existing tournament

The N&P Invitational becomes the canonical "event-1". Concretely:

1. Add `event_id` columns with a default of `'event-1'` on every relevant
   table.
2. Backfill existing rows (`UPDATE ... SET event_id = 'event-1'`).
3. Drop the default; require event_id explicitly going forward.
4. Insert one `event` row + one `brand_override` row for N&P that pins the
   current visual identity.

The current site keeps working at the same URLs; we just route them
through the event-aware layer.

---

## 13. Roll-out phases

| Phase | Scope | Ships |
|---|---|---|
| **0 — refactor** | event_id everywhere, repos take event context, SSE channel namespacing | invisible to N&P users |
| **1 — public read** | event home + leaderboard + roster on `/<event>` slugs; existing site → event-1 | second event can run |
| **2 — auth & roles** | magic-link login; commissioner & scorer role grants per event | self-serve commissioners |
| **3 — formats & courses** | format plugin registry; course library; setup wizard | new formats / courses |
| **4 — wagering** | skins, presses, CTP/long drive, calcutta, custom side bets | wagering tab |
| **5 — branding** | per-event palette + wordmark + custom domain | event-branded sites |

Each phase is independently shippable behind feature flags.

Earlier drafts had a phase for GHIN handicap sync; that's deferred —
see §6. Manual handicaps are the only source we ship.

---

## 14. Out of scope for v1

- Native mobile apps. (Web-only, mobile-responsive.)
- Real money handling. (Side bets are a ledger, not Stripe.)
- Tournament scoring on official USGA-rule edge cases (provisional balls,
  match-play concessions UI, etc.) — we stay accurate to the formats we
  ship and document gaps explicitly.
- Pace-of-play / tee-time-management beyond the existing tee group model.
- Multiple commissioners per event (single-commissioner v1; co-commissioners
  later).
