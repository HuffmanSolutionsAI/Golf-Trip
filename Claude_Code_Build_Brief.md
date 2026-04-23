# The Neal & Pam Invitational — Web App Build Brief

**For:** Claude Code
**From:** Reid (commissioner)
**Event date:** May 7–9, 2026 · Pinehurst, NC
**Target deploy:** `np.huffmanai.com`
**Goal:** Ship a production-quality mobile-first scoring web app before the first tee time on **Thursday, May 7, 2026 at 10:21 AM**.

---

## 0. How to use this document

This is a complete, self-contained spec. Read it end-to-end once before starting. Then execute the phases in §15 in order — each phase is a checkpoint where you should stop, verify, and report before proceeding to the next.

If you hit a real ambiguity that's not answered here, use your best judgment and **document the decision in a `DECISIONS.md` file at the repo root** so I can review later. Don't block the build asking questions.

All dollar costs should stay in free tiers. Do not add paid services, paid APIs, or paid dependencies without explicit approval.

---

## 1. What we're building

A scoring app for a 20-player, 5-team, 3-day Ryder-Cup-style golf tournament. Each player gets a login (magic link), enters their own hole-by-hole scores for whichever round they're playing, and watches a live leaderboard update as scores come in across 20 phones.

### Success criteria

The app is successful if, on Saturday evening of the trip:

1. Every player was able to sign in without commissioner help.
2. Every hole of every round was captured in the app by someone on each team.
3. The leaderboard was live and accurate throughout — no one had to ask "what's the score?"
4. No spreadsheet was opened during the trip.
5. The chat feed has organic messages from players, not just system auto-posts.

### Non-goals

- Tee sheet management / pairings outside of the 3 tournament rounds
- Side bets / skins / closest-to-the-pin / long drive contests (stretch only)
- Payments, Venmo, etc.
- Native mobile apps
- Push notifications
- Multi-tenancy / reusability for other tournaments (this is single-event software)
- GPS yardage / course maps

---

## 2. Stack (fixed — do not substitute)

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 15** (App Router) | TypeScript strict mode |
| UI | **Tailwind CSS v4 + shadcn/ui** | Customize shadcn theme to Midnight Oak palette (§4) |
| DB + Auth + Realtime | **Supabase** | Postgres, RLS, magic-link auth, realtime subscriptions |
| Hosting | **Vercel** | Hobby tier. Use the official Supabase integration |
| Node | 20.x LTS | |
| Package manager | pnpm | |
| Forms | react-hook-form + zod | |
| State (client) | React state + Supabase realtime; no Redux/Zustand |
| Date/time | date-fns | |
| Icons | lucide-react | |

### Project structure

```
/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── claim/              # First-time name + passcode claim
│   ├── (app)/                  # Authenticated routes
│   │   ├── home/
│   │   ├── leaderboard/
│   │   ├── schedule/
│   │   ├── teams/
│   │   │   └── [id]/
│   │   ├── players/
│   │   │   └── [id]/
│   │   ├── day1/
│   │   │   └── matches/[id]/
│   │   ├── day2/
│   │   │   └── entries/[id]/
│   │   ├── day3/
│   │   │   └── entries/[id]/
│   │   ├── chat/
│   │   └── admin/
│   ├── api/                    # Route handlers (see §9)
│   ├── layout.tsx
│   └── page.tsx                # Landing / marketing (pre-auth)
├── components/
│   ├── ui/                     # shadcn primitives
│   ├── brand/                  # Badge, Wordmark SVG components
│   ├── scoring/                # Scorecard, HoleEntrySheet, etc.
│   ├── leaderboard/
│   ├── chat/
│   └── layout/                 # TopNav, BottomTabBar, Sidebar
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # browser client
│   │   ├── server.ts           # server component client
│   │   └── middleware.ts
│   ├── scoring/                # ALL scoring math — pure functions, heavily tested
│   │   ├── day1.ts             # net match play
│   │   ├── day2.ts             # 2-man scramble pools
│   │   ├── day3.ts             # 4-man scramble + under par
│   │   ├── standings.ts        # aggregation
│   │   ├── handicaps.ts        # rounding + stroke allocation
│   │   └── __tests__/          # vitest
│   ├── types.ts                # Shared TS types mirroring DB schema
│   └── utils.ts
├── supabase/
│   ├── migrations/             # SQL migrations in order
│   └── seed.sql                # Seed data (see §7)
├── public/
│   └── badge.svg               # N&P badge as static asset
├── middleware.ts               # Auth redirect logic
├── DECISIONS.md                # You maintain this for any judgment calls
└── README.md                   # Setup instructions for me
```

---

## 3. Environment & secrets

Expected env vars (Vercel + local `.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only, never exposed
TRIP_PASSCODE=pinehurst2026        # for the first-sign-in gate
COMMISSIONER_EMAIL=                # to flag Reid as admin on first sign-in
```

In `README.md`, walk me through creating the Supabase project, setting these, running migrations, and deploying to Vercel. I'll need clear, copy-paste-able instructions.

---

## 4. Brand: Midnight Oak + N&P badge

### Palette (CSS variables, expose via Tailwind theme)

```css
--color-navy: #1A2E3B;        /* Midnight Navy — primary */
--color-navy-deep: #0F1E28;   /* darker accent */
--color-gold: #B08840;        /* Gold Leaf — accent */
--color-gold-light: #D4A95C;  /* hover/highlight */
--color-cream: #F3ECD8;       /* text on dark, card surfaces */
--color-paper: #FAF6EB;       /* app background */
--color-oxblood: #6B0F0F;     /* destructive, live indicator */
--color-ink: #1A1A1A;         /* body copy */
--color-rule: #D8CCB0;        /* dividers */
```

### Typography (Google Fonts)

- **Display / headers:** Playfair Display (500, 700; italic available)
- **Body:** Cormorant Garamond (400, 500, 600; italic available)
- **UI / labels / data:** Inter (400, 500, 600, 700)
- **Monospace / scores in tables:** JetBrains Mono (400, 500)

### The N&P badge

Render as an inline SVG React component at `components/brand/Badge.tsx`. Reproduce this exactly (it's the permanent brand mark):

```tsx
// Badge.tsx — circular N&P monogram seal, dark-navy fill
// Props: size (number, default 48), variant: 'dark' | 'light' (default dark)
// - dark: navy fill, cream text, gold ring
// - light: cream fill, navy text, gold ring (for placing on navy backgrounds with inversion)
//
// Composition:
// - Outer circle r=75, fill=navy, stroke=gold width=1.5
// - Inner decorative circle r=68, stroke=cream width=0.5
// - Top arc text "THE INVITATIONAL" in Inter 500, letter-spacing 0.4em, centered on arc (28,82)→(132,82)
// - "N&P" monogram centered (80, 97), Playfair Display italic 500, size 40, fill=cream
// - Horizontal rule line from (52,110) to (108,110), stroke=gold width=0.5
// - "EST. MMXXII" centered at (80,124), Inter 500, size 7, letter-spacing 0.3em, fill=gold
```

### Stacked wordmark component

```tsx
// Wordmark.tsx — "THE / Neal & Pam / INVITATIONAL" stacked
// Top/bottom horizontal rules in gold (stroke 0.5)
// "THE" — Inter 500, size 10, letter-spacing 0.4em, color=gold, uppercase
// "Neal & Pam" — Playfair Display italic 500, size 28, color=navy (or cream on dark)
// "INVITATIONAL" — Inter 500, size 11, letter-spacing 0.4em, uppercase
```

### Component tone

- Navy top nav bar on every authenticated page, with the Badge (size 40) at left and "THE INVITATIONAL" wordmark to its right.
- Cream content surfaces on paper background.
- Gold used sparingly — primary action buttons, eyebrow labels, divider accents.
- Avoid Masters/Augusta visual clichés (no pine trees, no crossed clubs, no flagstick icons as decoration — this is a monogram brand, not a crest brand).
- Mobile feel: Pinehurst Resort hotel lobby, not pro shop.

---

## 5. Domain & deployment

- Production: `np.huffmanai.com`
- Reid will set up a CNAME from `np.huffmanai.com` → Vercel's assigned URL. In the `README.md`, include the exact DNS record Reid needs to create.
- Preview deploys: automatic on PRs, use Vercel's default `*.vercel.app` subdomains.

---

## 6. Data model

All tables live in the `public` schema. All `id` columns are `uuid` with `default gen_random_uuid()`. All tables get `created_at timestamptz default now()` and `updated_at timestamptz default now()` (with an update trigger). Every table has Row Level Security enabled — see §8.

### 6.1 `teams`

```sql
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,                  -- "Team 1".."Team 5"
  display_color text not null,         -- hex, for leaderboard badges
  sort_order int not null,             -- 1..5
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

Five rows, seeded in `seed.sql`. Use these hex colors for the 5 teams (navy-compatible accent family):

| Team | Color | Hex |
|---|---|---|
| Team 1 | Crimson | `#A83232` |
| Team 2 | Forest | `#2F5233` |
| Team 3 | Cobalt | `#2D4E8A` |
| Team 4 | Amber | `#B07324` |
| Team 5 | Plum | `#5B2B4C` |

### 6.2 `players`

```sql
create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  handicap numeric(4,1) not null,       -- e.g. 2.9, 34.9
  team_id uuid not null references teams(id),
  team_slot text not null check (team_slot in ('A','B','C','D')),
  user_id uuid references auth.users(id) on delete set null,  -- set on first sign-in
  is_admin boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(team_id, team_slot)
);
```

### 6.3 `rounds`

```sql
create table rounds (
  id uuid primary key default gen_random_uuid(),
  day int not null check (day in (1,2,3)),
  date date not null,
  course_name text not null,
  total_par int not null,               -- sum of hole pars
  format text not null check (format in ('singles','scramble_2man','scramble_4man')),
  tee_time time not null,
  is_locked boolean not null default false,  -- commissioner locks after round ends
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(day)
);
```

### 6.4 `holes`

```sql
create table holes (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  hole_number int not null check (hole_number between 1 and 18),
  par int not null check (par between 3 and 5),
  handicap_index int check (handicap_index between 1 and 18),  -- nullable for Holly until filled
  yardage int,                          -- nullable, from the Gold/Blue tees we're playing
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(round_id, hole_number)
);
```

### 6.5 `matches` (Day 1 only)

```sql
create table matches (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  match_number int not null check (match_number between 1 and 10),
  player1_id uuid not null references players(id),
  player2_id uuid not null references players(id),
  -- Stroke allocation frozen at match-seed time (see §10.2):
  stroke_giver_id uuid references players(id),  -- null = no strokes (within-1 rule)
  strokes_given int not null default 0 check (strokes_given between 0 and 11),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(round_id, match_number),
  check (player1_id <> player2_id)
);
```

### 6.6 `scramble_entries` (Day 2 & Day 3)

```sql
create table scramble_entries (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  team_id uuid not null references teams(id),
  pool text check (pool in ('AD','BC')),  -- Day 2 only; null for Day 3
  manual_tiebreak_rank int,               -- commissioner-set, nullable
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(round_id, team_id, pool)
);
```

### 6.7 `scramble_participants` (which players are in which scramble entry)

```sql
create table scramble_participants (
  scramble_entry_id uuid not null references scramble_entries(id) on delete cascade,
  player_id uuid not null references players(id),
  primary key (scramble_entry_id, player_id)
);
```

For Day 2 AD pair: two rows (the A + D players). For Day 2 BC pair: two rows (B + C players). For Day 3: four rows (all team members).

### 6.8 `hole_scores` (the source of truth)

```sql
create table hole_scores (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  player_id uuid references players(id),              -- set for Day 1
  scramble_entry_id uuid references scramble_entries(id),  -- set for Day 2/3
  hole_number int not null check (hole_number between 1 and 18),
  strokes int not null check (strokes between 1 and 15),
  entered_by uuid not null references auth.users(id),
  entered_at timestamptz not null default now(),
  -- Exactly one of player_id / scramble_entry_id must be set:
  check ((player_id is not null)::int + (scramble_entry_id is not null)::int = 1),
  unique(player_id, round_id, hole_number),
  unique(scramble_entry_id, hole_number)
);
```

Add an `AFTER INSERT/UPDATE/DELETE` trigger that updates `updated_at` on the parent round. Keep publication for realtime enabled on this table.

### 6.9 `chat_messages`

```sql
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),   -- null for system posts
  player_id uuid references players(id),    -- denormalized for display, null for system
  body text not null,
  kind text not null default 'human' check (kind in ('human','system')),
  posted_at timestamptz not null default now()
);
```

System posts are written by server-side code on certain events (§13).

### 6.10 `audit_log`

```sql
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  action text not null,                     -- e.g. 'score.upsert', 'handicap.edit'
  entity_type text,
  entity_id uuid,
  before_value jsonb,
  after_value jsonb,
  occurred_at timestamptz not null default now()
);
```

Any edit to `hole_scores`, `players.handicap`, `holes.par`, `holes.handicap_index`, or `scramble_entries.manual_tiebreak_rank` writes an audit entry via trigger.

### 6.11 Derived views

Implement these as SQL views (not materialized). Query performance is a non-issue at this scale.

#### `v_round_progress`
Per round: total holes expected, total holes entered, percent complete, is_complete (bool). "Holes expected" = 10 matches × 18 × 2 players for Day 1, 10 entries × 18 for Day 2 (5 AD + 5 BC), 5 teams × 18 for Day 3.

#### `v_day1_match_state`
Per match, hole-by-hole: p1_gross, p2_gross, p1_net (after applying stroke on strokes-given holes), p2_net, running holes_up (+ means p1 up), match_over (bool, true if lead > holes remaining). Fields for final: `p1_total_net`, `p2_total_net`, `winner_player_id` (null on tie), `p1_team_points`, `p2_team_points`, `status` ('pending'|'in_progress'|'final').

#### `v_day2_pool_ranks`
Per `scramble_entries` row in Day 2: `team_raw` (sum of hole strokes), `holes_thru`, `rank_in_pool` (1..5), `points` (5/3/1/0/0 per rank; manual_tiebreak_rank overrides rank if set), `projected` (bool — true if thru < 18).

#### `v_day3_standings`
Per `scramble_entries` row in Day 3: `team_raw`, `holes_thru`, `under_par` (max(0, total_par_thru - team_raw_thru), using par of holes played so far), `rank`, `placement_points` (8/6/4/2/0), `bonus_points` (under_par × 1), `total_points`.

#### `v_team_points`
Per team: `day1_points`, `day2_points` (AD+BC summed), `day3_points`, `total_points`. Used by the main leaderboard.

#### `v_leaderboard`
Team-ranked result joining `teams` + `v_team_points` + an `is_projected` boolean (true if any round is still in progress) and `status_label` (e.g. "Thru Day 2" or "Final").

---

## 7. Seed data

Implement `supabase/seed.sql` with all of the following. Running migrations + seed should produce a fully functional read-only app immediately.

### 7.1 Teams

```sql
insert into teams (name, display_color, sort_order) values
  ('Team 1', '#A83232', 1),
  ('Team 2', '#2F5233', 2),
  ('Team 3', '#2D4E8A', 3),
  ('Team 4', '#B07324', 4),
  ('Team 5', '#5B2B4C', 5);
```

### 7.2 Players

Insert all 20 players with their handicap and team assignment from the current Excel draft. The team assignments are final as of now; handicaps are **editable until Monday May 4** (deadline before Day 1).

| Team | Slot | Name | Handicap |
|---|---|---|---|
| Team 1 | A | Reid | 2.9 |
| Team 1 | B | Tom | 12.9 |
| Team 1 | C | Luke | 14.9 |
| Team 1 | D | Bot | 34.9 |
| Team 2 | A | Pincus | 6.7 |
| Team 2 | B | Byrnes | 12.1 |
| Team 2 | C | Foley | 15.0 |
| Team 2 | D | Matkins | 23.6 |
| Team 3 | A | Ham | 7.3 |
| Team 3 | B | Ric | 11.0 |
| Team 3 | C | Davis | 15.2 |
| Team 3 | D | Mallen | 23.0 |
| Team 4 | A | Nate | 7.4 |
| Team 4 | B | McArdle | 10.8 |
| Team 4 | C | Bands | 15.2 |
| Team 4 | D | Mason | 21.3 |
| Team 5 | A | Keller | 7.6 |
| Team 5 | B | Mellis | 9.0 |
| Team 5 | C | Bennett | 19.8 |
| Team 5 | D | Cota | 20.0 |

Mark Reid as `is_admin = true`.

### 7.3 Rounds

```sql
insert into rounds (day, date, course_name, total_par, format, tee_time) values
  (1, '2026-05-07', 'Pinewild CC — Holly Course',   72, 'singles',       '10:21:00'),
  (2, '2026-05-08', 'Talamore Golf Club',           71, 'scramble_2man', '08:45:00'),
  (3, '2026-05-09', 'Hyland Golf Club',             72, 'scramble_4man', '10:00:00');
```

### 7.4 Holes — Talamore (Day 2), par 71

```
Hole  Par  Hdcp
  1    5    4
  2    3   16
  3    4    6
  4    5   14
  5    3   18
  6    4   12
  7    4    2
  8    4    8
  9    4   10
 10    4    7
 11    5   15
 12    4    5
 13    3   17
 14    4    9
 15    3   13
 16    4    1
 17    4   11
 18    4    3
```

### 7.5 Holes — Hyland (Day 3), par 72

```
Hole  Par  Hdcp
  1    4   11
  2    4    7
  3    3   17
  4    4    1
  5    4    5
  6    3   15
  7    5    9
  8    4   13
  9    5    3
 10    3   16
 11    4   10
 12    5    2
 13    3   14
 14    4    8
 15    4    6
 16    4   18
 17    5    4
 18    4   12
```

### 7.6 Holes — Pinewild Holly (Day 1), par 72 — DATA NOT YET KNOWN

Pinewild is private and hole data isn't publicly available. For seed purposes, insert 18 placeholder rows with `par = 4` and `handicap_index = null`, with a par-72 total split as 4 par-3s + 10 par-4s + 4 par-5s in a plausible order. Mark this clearly in a comment in `seed.sql`:

```sql
-- PLACEHOLDER: Pinewild Holly hole-level data will be filled in at the pro shop on 5/7.
-- Admin UI allows updating par + handicap_index per hole. Day 1 stroke allocation
-- will re-compute when handicap_index values are populated.
```

Suggested placeholder layout (commissioner can replace):

```
Hole  Par  Hdcp
  1    4   null
  2    5   null
  3    3   null
  4    4   null
  5    4   null
  6    4   null
  7    3   null
  8    5   null
  9    4   null
 10    4   null
 11    4   null
 12    3   null
 13    5   null
 14    4   null
 15    4   null
 16    4   null
 17    3   null
 18    5   null
```

Totals: four 3s + ten 4s + four 5s = 12 + 40 + 20 = 72. ✓

### 7.7 Matches (Day 1 singles)

Ten matches, pre-computed from current team slots. Store with `stroke_giver_id` and `strokes_given` per the handicap math in §10.2 (computed against *current* handicaps; admin UI can re-seed when handicaps are edited before Monday).

Matchups (team-slot pairings from the Excel tracker):

| # | P1 | P2 |
|---|---|---|
| 1 | Reid (T1-A) | Pincus (T2-A) |
| 2 | Tom (T1-B) | Ham (T3-B) |
| 3 | Luke (T1-C) | Bands (T4-C) |
| 4 | Bot (T1-D) | Bennett (T5-D) |
| 5 | Foley (T2-C) | Davis (T3-C) |
| 6 | Byrnes (T2-B) | McArdle (T4-B) |
| 7 | Matkins (T2-D) | Cota (T5-D) |
| 8 | Mallen (T3-D) | Mason (T4-D) |
| 9 | Ric (T3-B) | Mellis (T5-B) |
| 10 | Nate (T4-A) | Keller (T5-A) |

**Wait — the matchup table above has some slot mismatches** (e.g. match 4 has both D slots but there's only 1 D per team on different teams; match 7 pits T2-D vs T5-D but both are D slots which is fine). Let me re-verify against the Excel (§excel matchups in original spreadsheet):

Correct matchups from Excel Day 1 sheet:
1. Reid (T1) vs Pincus (T2)
2. Tom (T1) vs Ham (T3)
3. Luke (T1) vs Bands (T4)
4. Bot (T1) vs Bennett (T5)
5. Foley (T2) vs Davis (T3)
6. Byrnes (T2) vs McArdle (T4)
7. Matkins (T2) vs Cota (T5)
8. Mallen (T3) vs Mason (T4)
9. Ric (T3) vs Mellis (T5)
10. Nate (T4) vs Keller (T5)

This means each team plays the other 4 teams exactly twice, across the 10 total matches. That's correct round-robin structure.

### 7.8 Scramble entries — Day 2 (Talamore 2-man, 2 pools)

10 entries total: 5 AD pairs + 5 BC pairs.

```
Team 1 AD: Reid + Bot
Team 1 BC: Tom + Luke
Team 2 AD: Pincus + Matkins
Team 2 BC: Byrnes + Foley
Team 3 AD: Ham + Mallen
Team 3 BC: Ric + Davis
Team 4 AD: Nate + Mason
Team 4 BC: McArdle + Bands
Team 5 AD: Keller + Cota
Team 5 BC: Mellis + Bennett
```

### 7.9 Scramble entries — Day 3 (Hyland 4-man)

5 entries, one per team, each with all 4 players.

---

## 8. Row-level security (RLS)

Enable RLS on every table. Policies:

### `players`, `teams`, `rounds`, `holes`, `matches`, `scramble_entries`, `scramble_participants`
- **SELECT**: allowed for any authenticated user AND any anon user (spectator mode — read-only)
- **INSERT/UPDATE/DELETE**: only if `is_admin_for(auth.uid())` — a helper SQL function that checks `exists (select 1 from players where user_id = auth.uid() and is_admin)`

### `hole_scores`
- **SELECT**: authenticated OR anon
- **INSERT/UPDATE**: allowed if caller is admin, OR caller's player is the target `player_id` (Day 1), OR caller's player is a member of the target `scramble_entry_id` via `scramble_participants` (Days 2/3)
- **DELETE**: admin only

### `chat_messages`
- **SELECT**: authenticated only (not anon — spectators can't see chat)
- **INSERT**: authenticated, `user_id` must equal `auth.uid()`, `kind` must be `'human'`
- **UPDATE/DELETE**: only the author, or admin
- System inserts (`kind='system'`) go through service-role server-side code that bypasses RLS

### `audit_log`
- **SELECT**: admin only
- **INSERT**: via trigger (bypasses RLS by definition)

Write the helper function:

```sql
create or replace function public.is_admin_for(uid uuid) returns boolean
language sql stable security definer as $$
  select exists (select 1 from public.players where user_id = uid and is_admin = true)
$$;
```

---

## 9. API routes

Next.js route handlers under `app/api/`. All write routes validate input with Zod and use the server Supabase client (respects RLS for non-admin writes; uses service role only for system chat posts and seed operations).

### Auth & claim flow

- `POST /api/claim` — body `{ playerId, passcode }`. Verifies the passcode matches `TRIP_PASSCODE`, that the player has no `user_id` set, and that the caller is authenticated. Sets `players.user_id = auth.uid()`. If `auth.email()` matches `COMMISSIONER_EMAIL`, also sets `is_admin = true`. Returns the updated player record.

### Score entry

- `POST /api/scores/day1` — body `{ matchId, playerId, holeNumber, strokes }`. Upserts into `hole_scores`. Triggers side-effects (§13 chat auto-posts).
- `POST /api/scores/day2` — body `{ scrambleEntryId, holeNumber, strokes }`. Upserts into `hole_scores`.
- `POST /api/scores/day3` — body `{ scrambleEntryId, holeNumber, strokes }`. Same shape as day2.
- `DELETE /api/scores/:scoreId` — admin only.

### Admin

- `POST /api/admin/handicap` — body `{ playerId, handicap }`. Updates handicap. If Day 1 round is not yet locked, triggers re-computation of all Day 1 `matches.stroke_giver_id` and `matches.strokes_given`.
- `POST /api/admin/hole` — body `{ holeId, par?, handicap_index?, yardage? }`. Updates hole metadata. Triggers Day 1 stroke re-allocation if Day 1 holes changed.
- `POST /api/admin/tiebreak` — body `{ scrambleEntryId, manualRank }`. Sets Day 2 manual tiebreak.
- `POST /api/admin/lock-round` — body `{ roundId }`. Sets `rounds.is_locked = true`. Posts system chat message.
- `POST /api/admin/override-score` — body `{ scoreId, strokes }` or `{ playerId?, scrambleEntryId?, roundId, holeNumber, strokes }`. Writes audit entry.

### Chat

- `POST /api/chat` — body `{ body }`. Inserts a `chat_messages` row with `kind='human'`, `user_id=auth.uid()`, and `player_id` looked up from players.

### System (internal)

- Triggered from score-entry routes — no external endpoint. See §13.

---

## 10. Scoring engine

All scoring logic lives in `lib/scoring/*.ts` as **pure functions** with **full unit test coverage** using Vitest. SQL views in §6.11 are essentially direct ports of these functions to SQL for realtime leaderboard queries; the TypeScript functions are the reference implementation and are what the tests run against.

### 10.1 Handicap rounding

```ts
// lib/scoring/handicaps.ts

export function roundHandicap(hcp: number): number {
  // Standard rounding (0.5 rounds up). 7.3 → 7, 7.6 → 8, 2.9 → 3, 34.9 → 35.
  return Math.round(hcp);
}
```

### 10.2 Day 1 stroke allocation

Rules (from brief §8):

1. Round each player's handicap.
2. Compute `gap = |p1Rounded - p2Rounded|`.
3. If `gap <= 1`, no strokes given.
4. Otherwise, stroke giver is the higher-handicap player. Strokes given = `min(gap, 11)` (11-stroke cap).
5. Strokes fall on the `strokesGiven` hardest holes by `handicap_index` (index 1 = hardest).

```ts
export type StrokeAllocation = {
  strokeGiverId: string | null;  // null = no strokes
  strokesGiven: number;
  strokeHoles: number[];         // list of hole numbers that receive a stroke
};

export function computeStrokeAllocation(
  p1: { id: string; handicap: number },
  p2: { id: string; handicap: number },
  holes: { hole_number: number; handicap_index: number | null }[]
): StrokeAllocation {
  const r1 = roundHandicap(p1.handicap);
  const r2 = roundHandicap(p2.handicap);
  const gap = Math.abs(r1 - r2);

  if (gap <= 1) {
    return { strokeGiverId: null, strokesGiven: 0, strokeHoles: [] };
  }

  const strokesGiven = Math.min(gap, 11);
  const strokeGiverId = r1 > r2 ? p1.id : p2.id;

  // Pick strokesGiven hardest holes (lowest handicap_index).
  // If handicap_index is null (Pinewild Holly pre-fill), return empty — commissioner
  // will re-seed once data is entered.
  const withIndex = holes.filter(h => h.handicap_index !== null);
  if (withIndex.length < strokesGiven) {
    return { strokeGiverId, strokesGiven, strokeHoles: [] };  // pending index data
  }
  const sorted = [...withIndex].sort((a, b) => a.handicap_index! - b.handicap_index!);
  const strokeHoles = sorted.slice(0, strokesGiven).map(h => h.hole_number).sort((a, b) => a - b);

  return { strokeGiverId, strokesGiven, strokeHoles };
}
```

### 10.3 Day 1 match result

Per brief §7: match play decided by **total net strokes over 18 holes**. Win = 2 pts; Tie = 1 pt each; Loss = 0.

```ts
export function computeDay1MatchResult(
  match: { p1Id: string; p2Id: string; strokeGiverId: string | null; strokesGiven: number; strokeHoles: number[] },
  p1Scores: Map<number, number>,  // hole -> strokes
  p2Scores: Map<number, number>,
): {
  p1TotalNet: number | null;  // null if not all 18 entered
  p2TotalNet: number | null;
  winnerId: string | null;    // null = tie OR not final
  p1TeamPoints: number;       // 0, 1, or 2
  p2TeamPoints: number;
  status: 'pending' | 'in_progress' | 'final';
  holesPlayed: number;
  currentHolesUp: number;     // + = p1 up, - = p2 up (match-play convention for display)
} {
  // Implementation reads hole-by-hole, applies strokes on strokeHoles,
  // sums net, computes running holes-up for display purposes.
  // Only award points when both players have all 18 holes.
  // ...
}
```

### 10.4 Day 2 pool ranks

```ts
export function computeDay2PoolRanks(
  pool: 'AD' | 'BC',
  entries: { id: string; teamId: string; holeScores: Map<number, number>; manualRank: number | null }[]
): Map<string, { entryId: string; rank: number; points: number; raw: number; holesThru: number; projected: boolean }> {
  // Points by rank: 1=5, 2=3, 3=1, 4=0, 5=0.
  // Rank by raw score ASC, with manualRank overriding if set.
  // If any entry hasn't played all 18, projected=true for all, and points are shown
  // as "projected" but rank order reflects current raw + (avg of holes-not-played)? NO.
  // Simpler: while projected, rank by current thru-N raw. Final points awarded only
  // after all five entries in pool complete 18.
}
```

### 10.5 Day 3 placement + under-par

```ts
export function computeDay3Standings(
  entries: { id: string; teamId: string; holeScores: Map<number, number> }[],
  holes: { hole_number: number; par: number }[]
): Map<string, { entryId: string; rank: number; placementPts: number; underPar: number; bonusPts: number; totalPts: number; raw: number; projected: boolean }> {
  // Placement: 1=8, 2=6, 3=4, 4=2, 5=0.
  // Bonus: 1 pt per stroke under par (par of holes played, while projected).
  // totalPts = placementPts + bonusPts (bonusPts only finalized after 18 holes).
}
```

### 10.6 Running projections (partial rounds)

The UI always shows live data — "Thru 12 · projected 3rd" etc. Rules:

- A round is "complete" when every expected hole score is recorded.
- While incomplete, sum the holes entered; display "Thru N" alongside the raw.
- Rank remains computable at any time (rank by raw thru same number of holes; if teams are thru different counts, rank by raw + projection = raw × (18/holesThru) as a rough par-neutral extrapolation, ONLY for display sort order, clearly marked as projected).
- Team points are not awarded (don't roll into `v_team_points.day*_points`) until the round is complete.

### 10.7 Tests (write these — non-negotiable)

Under `lib/scoring/__tests__/`:

- `handicaps.test.ts` — verify rounding edge cases, within-1 rule, 11-cap with all 10 current matchups. Assert the expected output for every Day 1 pairing (see table below).
- `day1.test.ts` — match result scenarios: clean win, tie, win via strokes, strokes on hardest holes only, pre-final state, all-18 final state.
- `day2.test.ts` — pool ranking: ties, manual tiebreaks, all-18 vs projected.
- `day3.test.ts` — placement + under par: team finishes 8 under (8 placement + 8 bonus = 16), team finishes over par (placement only), 5-way tie scenarios.
- `standings.test.ts` — integration: feed in a complete tournament, assert final leaderboard.

**Required test assertions for `handicaps.test.ts` — all 10 Day 1 matchups using current handicaps:**

| Match | P1 (HCP) | P2 (HCP) | Rounded | Gap | Stroke Giver | Strokes |
|---|---|---|---|---|---|---|
| 1 | Reid (2.9) | Pincus (6.7) | 3 vs 7 | 4 | Pincus | 4 |
| 2 | Tom (12.9) | Ham (7.3) | 13 vs 7 | 6 | Tom | 6 |
| 3 | Luke (14.9) | Bands (15.2) | 15 vs 15 | 0 | none | 0 |
| 4 | Bot (34.9) | Bennett (19.8) | 35 vs 20 | 15 | Bot | 11 (capped) |
| 5 | Foley (15.0) | Davis (15.2) | 15 vs 15 | 0 | none | 0 |
| 6 | Byrnes (12.1) | McArdle (10.8) | 12 vs 11 | 1 | none | 0 |
| 7 | Matkins (23.6) | Cota (20.0) | 24 vs 20 | 4 | Matkins | 4 |
| 8 | Mallen (23.0) | Mason (21.3) | 23 vs 21 | 2 | Mallen | 2 |
| 9 | Ric (11.0) | Mellis (9.0) | 11 vs 9 | 2 | Ric | 2 |
| 10 | Nate (7.4) | Keller (7.6) | 7 vs 8 | 1 | none | 0 |

---

## 11. Auth flow

Using Supabase Auth with the magic-link (OTP email) method.

### Sign-in

1. User lands on `/`, sees the badge, tagline, and an email input. Submits email → `supabase.auth.signInWithOtp({ email })`.
2. User sees a "Check your email" confirmation.
3. User clicks the link in their email → redirected to `/auth/callback` → session established → redirected.

### First-time claim (`/claim`)

On first successful auth, the middleware checks if `auth.uid()` corresponds to a `players.user_id`. If NOT, redirect to `/claim`.

On `/claim`:

1. Show a dropdown of unclaimed players (all `players` rows where `user_id is null`).
2. Show a passcode input.
3. Submit → `POST /api/claim` → on success, redirect to `/home`.

On subsequent sign-ins, middleware sees the user is linked to a player → allow direct access.

### Commissioner bootstrap

On the first claim for the email matching `COMMISSIONER_EMAIL` (Reid's), the `POST /api/claim` handler also sets `players.is_admin = true`.

### Spectator mode

Anyone hitting `/` without an email can optionally click a "View leaderboard" link that goes straight to `/leaderboard` as anon. Read-only. No chat, no score entry. Banner at top reads "Viewing as spectator · [Sign in] for score entry."

---

## 12. Pages / screens

Every authenticated page includes the TopNav (navy bar with Badge size 40 on the left, "THE INVITATIONAL" wordmark to its right, user avatar dropdown on right showing player name and sign-out). On mobile, add a BottomTabBar with 5 tabs: Home / Leaderboard / Schedule / Teams / Chat. On desktop, replace the tab bar with a left sidebar.

### 12.1 `/` — Landing (public)

- Navy background, inverted badge (cream fill variant) centered large.
- Stacked wordmark.
- Tagline: "Live scoring · Pinehurst · May 7–9"
- Email input + "Sign in with magic link" button (gold primary).
- Small link: "View leaderboard as spectator →"
- Year meta at bottom: "Year V · MMXXVI"

### 12.2 `/claim` — First-time player claim

- Heading: "One last step"
- Dropdown: "Which one are you?" — list of unclaimed player names with their team and handicap
- Input: "Trip passcode"
- Submit button (gold)
- Copy below: "If you're not in the list, it means someone else already claimed that name. Ping Reid."

### 12.3 `/home` — Dashboard

Primary sections, top to bottom:

1. **Hero action card**: either "Enter your Day N scores" (gold button, links to your scorecard for whichever round is live), "⏰ Day 2 tees off in 2h 15m · Talamore" if round is upcoming, or "🏆 Tournament complete — final results" if done.
2. **Your team's rank**: "Team 1 · 2nd · 11 pts · Thru Day 2"
3. **Top 3 leaderboard preview**: first 3 rows of the leaderboard, with "See full" link.
4. **Chat preview**: last 3 messages, "See all" link.
5. **Schedule snippet**: 3 rounds listed with course, tee time, status (Upcoming / Live / Final).

### 12.4 `/leaderboard`

- Header: current tournament status ("Thru Day 1" / "Live · Day 2" / "Final")
- 5 team rows, each showing:
  - Rank (1-5)
  - Team color dot + team name
  - Top player badge (team captain — slot A)
  - Points breakdown: "D1: 2 · D2: 6 · D3: —" small mono text
  - Total points, large
- Tap/click a row → expands inline to show the team's player list + links to their round scorecards
- Real-time updates via Supabase channel subscription — rows animate on rank change

### 12.5 `/schedule`

Three cards, one per round:

```
┌─────────────────────────────────┐
│ DAY 1 · THU 5/7 · 10:21 AM      │
│ Pinewild CC — Holly Course      │
│ Singles · Net match play        │
│ [ FINAL ]  Team 2 wins 8–4–6–0–2│
│ View matches →                  │
└─────────────────────────────────┘
```

Round status chip: UPCOMING (gray) / LIVE (oxblood with pulse animation) / FINAL (navy).

Clicking a card → drill-down page:

- Day 1 → list of 10 matches, each clickable to `/day1/matches/:id`
- Day 2 → two pool standings (AD and BC) + 10 entries, each clickable
- Day 3 → 5 team standings, each clickable

### 12.6 `/teams`

Grid of 5 team cards. Each shows:

- Team name + color bar
- Four players (A/B/C/D) with name, handicap, and avatar initial
- Cumulative points
- "View team →"

### 12.7 `/teams/:id`

Full team detail:

- Team header (big)
- 4 players with handicaps
- Round-by-round results:
  - Day 1: 4 singles matches for these players, with results
  - Day 2: 2 scramble entries (AD, BC) with pool ranks
  - Day 3: 1 team entry with rank + points

### 12.8 `/players/:id`

- Player name, handicap, team
- Day 1: their match — opponent, raw/net, result
- Day 2: their pair, team, raw, rank, points
- Day 3: their team, raw, rank, points

### 12.9 `/day1/matches/:id`

**The core score-entry screen for Day 1.** Mobile-first.

Layout:

```
┌──────────────────────────────────┐
│ ← Match 1 · Pinewild Holly       │
│                                  │
│ Reid (HCP 3)    Pincus (HCP 7)   │
│ Team 1          Team 2           │
│ gets 0          gets 4 strokes   │
│                                  │
│ ┌─── LIVE STATUS ────────────┐   │
│ │  Thru 10                   │   │
│ │  Reid 41 (41)  Pincus 45(41)│   │
│ │  Pincus 1 up (by net)      │   │
│ └────────────────────────────┘   │
│                                  │
│ Scorecard (tap a hole to enter)  │
│ H  Par Hdcp Reid Pincus          │
│ 1   4   3    4   5 •             │
│ 2   5   15   5   5               │
│ 3   4   7    4   4 •             │
│ …                                │
│10   4   1    ·   ·               │
│…                                 │
│                                  │
│ [ Enter hole 10 ]  ← gold        │
└──────────────────────────────────┘
```

- Strokes-given holes show a small gold dot (•) next to the stroke-receiving player's column.
- Running net is shown alongside raw — parenthetical "41 (41)" means raw 41, net 41 after stroke reduction.
- The current hole (first empty one) is highlighted; "Enter hole N" primary button launches the HoleEntrySheet.
- If both players have a score for every hole, screen flips to "FINAL" state with result + points awarded.

**Permissions**: Either player in the match can enter either player's score. (In practice, one person in the pairing is the scorekeeper.) Admin can edit anyone's.

### 12.10 `/day2/entries/:id`

**Core entry for Day 2.**

- Header: the pair (e.g. "Reid & Bot · Team 1 · Pool AD")
- Single scramble score per hole (it's a scramble — one score, not two)
- Live pool standing shown alongside: all 5 entries in this pool ranked
- Scorecard: H / Par / Hdcp / Score columns
- "Enter hole N" button

### 12.11 `/day3/entries/:id`

**Core entry for Day 3.**

- Header: team + 4 players (e.g. "Team 1 · Reid / Tom / Luke / Bot")
- Course par display at top
- Scorecard with par shown per hole
- Running under-par count: "Thru 10 · team score 38 (par 36) · +2"
- Projected points: "Projected: 2nd place (6 pts) + 0 bonus = 6 pts"
- "Enter hole N" button

### 12.12 `/chat`

- Timeline view, newest at bottom
- Human messages: author name + team color dot, timestamp, body
- System messages: different style (smaller, italic, centered, no author)
- Sticky input at bottom: text field + Send button
- Auto-scroll to bottom on new message
- Subscribe to Supabase realtime on `chat_messages`

### 12.13 `/admin`

Commissioner only. Tabs or sections:

1. **Players** — inline edit handicap for each player. "Re-seed Day 1 matches" button (only enabled before Day 1 locks).
2. **Holes** — for each round, a table of 18 holes with par + handicap_index + yardage editable. Especially needed for Pinewild Holly on Day 1 morning.
3. **Rounds** — lock/unlock each round.
4. **Score override** — search any hole score across any round, edit or delete.
5. **Day 2 tiebreak** — for each Day 2 entry, a manual rank input (overrides natural order if set).
6. **Audit log** — paginated list of all edits, newest first.

---

## 13. Chat auto-posts (system events)

From `/api/scores/*` handlers, after a successful write, check for these events and insert `chat_messages` with `kind='system'` via service role:

| Trigger | Message |
|---|---|
| A Day 1 match transitions from `in_progress` to `final` | `Match {N} · {Winner} def. {Loser} by {margin} net · +2 for {Winner}'s team` (or `halved · +1 each` on tie) |
| The overall leaderboard #1 team changes | `🏆 {Team} takes the lead ({points} pts)` |
| A player records a score of 2 on a par-4, or 3 on a par-5 (eagle or better) | `🦅 {Player} made {score} on hole {N} at {course}` |
| A player records a hole-in-one (score = 1 on a par 3) | `⛳ HOLE IN ONE · {Player} just aced hole {N}` |
| A round transitions to `is_locked = true` | `🔒 Day {N} · {format} · Final` |
| 30 minutes before a round's tee_time (cron-ish — see below) | `⏰ Day {N} tees off in 30 min · {course}` |

**Tee-time alert** — since we can't run a background job on Vercel Hobby easily, do this with a simple approach: a server-side check on *every* authenticated page load that looks for "is there a round in 25-35 minutes that hasn't had an alert posted yet?" and if so, posts one (use a `chat_messages.body` uniqueness check with the exact string to dedupe). Crude but effective for this use case.

**Deduping**: each system message kind has natural deduplication based on content (you can't re-post "Team 2 takes the lead" if Team 2 already leads). Implement sanity checks so the chat doesn't get spammed.

---

## 14. Realtime subscriptions

Client components that need live updates subscribe to Supabase channels:

- **Leaderboard page**: subscribe to `hole_scores` inserts/updates across all rounds → on any change, refetch leaderboard view.
- **Match / entry detail pages**: subscribe to `hole_scores` filtered by the relevant `player_id` or `scramble_entry_id` → refetch local state.
- **Chat page**: subscribe to `chat_messages` inserts → append to local state.

Make sure the Postgres publication includes these tables in `supabase_realtime`.

---

## 15. Build phases

Execute in order. At each checkpoint, stop and summarize what was done so I can verify before you continue.

### Phase 1 — Skeleton & auth (checkpoint 1)

- [ ] Next.js 15 app scaffolded with App Router, TypeScript strict, Tailwind v4, shadcn/ui
- [ ] Supabase project created (instructions in README for Reid)
- [ ] Migrations 0001–0010 written and applied (teams, players, rounds, holes, matches, scramble_entries, scramble_participants, hole_scores, chat_messages, audit_log)
- [ ] RLS policies enabled per §8
- [ ] Magic-link auth working end-to-end
- [ ] `/` landing page built with badge + wordmark + email input
- [ ] `/claim` first-time flow working
- [ ] `/home` stub showing "Hello, {player name}"
- [ ] Deployed to Vercel, custom domain `np.huffmanai.com` configured
- [ ] Commissioner (Reid) can sign in and see `is_admin = true`

**Checkpoint**: Reid signs in, claims a slot, sees a working (if empty) home page.

### Phase 2 — Seed data & read-only screens (checkpoint 2)

- [ ] `seed.sql` complete per §7 — teams, 20 players, 3 rounds, 54 hole rows (Talamore + Hyland real data; Holly placeholders), 10 Day 1 matches with frozen stroke allocations, 10 Day 2 scramble entries, 5 Day 3 entries, participants populated
- [ ] Brand components: `Badge`, `Wordmark`, `TopNav`, `BottomTabBar`, `Sidebar`
- [ ] `/schedule` page live with 3 round cards
- [ ] `/teams` page live with 5 team cards
- [ ] `/teams/:id`, `/players/:id` pages live (read-only, empty score sections)
- [ ] `/leaderboard` page live but all zeros
- [ ] `/admin` skeleton with players tab (read-only for now)

**Checkpoint**: Reid reviews all seeded data and brand, confirms it's correct before moving to Phase 3.

### Phase 3 — Day 1 end-to-end (checkpoint 3)

- [ ] `lib/scoring/handicaps.ts` implemented + tests passing
- [ ] `lib/scoring/day1.ts` implemented + tests passing
- [ ] `v_day1_match_state` view implemented
- [ ] `v_team_points` view implemented (Day 1 part only)
- [ ] `/day1/matches/:id` page fully functional:
  - Shows match header with strokes-given info
  - Live status block (Thru N, holes up)
  - Scorecard with stroke dots on stroke-holes
  - "Enter hole N" button → HoleEntrySheet modal with number pad
  - Writes to `/api/scores/day1`
- [ ] `/leaderboard` now reflects Day 1 points live
- [ ] `/home` hero action card points you to your Day 1 match if Day 1 is live
- [ ] Optimistic UI updates — score appears instantly on entry

**Checkpoint**: Reid and another player can sit on two phones, enter scores for Match 1 live, both see the leaderboard update, and see the match final result when all 18 holes are posted.

### Phase 4 — Days 2 & 3 (checkpoint 4)

- [ ] `lib/scoring/day2.ts` + tests passing
- [ ] `lib/scoring/day3.ts` + tests passing
- [ ] `v_day2_pool_ranks` and `v_day3_standings` views
- [ ] `/day2/entries/:id` page functional (single-score entry + live pool rank)
- [ ] `/day3/entries/:id` page functional (single-score entry + par tracking + under-par bonus + projected rank)
- [ ] Full `/leaderboard` with all 3 days aggregated
- [ ] Admin: Day 2 tiebreak UI

**Checkpoint**: Reid simulates full Day 2 and Day 3 scoring on test data, verifies pool points, under-par bonuses, and final standings match the Excel tracker for identical inputs.

### Phase 5 — Chat + admin + realtime (checkpoint 5)

- [ ] `/chat` page with human message posting
- [ ] System auto-posts on: match final, lead change, eagle/better, round locked, tee-time alerts
- [ ] Realtime subscriptions on leaderboard, match/entry detail pages, chat
- [ ] Admin: handicap editor with "re-seed Day 1 matches" button
- [ ] Admin: hole par/handicap_index editor (especially for Holly)
- [ ] Admin: score override
- [ ] Admin: audit log viewer
- [ ] Admin: round lock/unlock

**Checkpoint**: Reid edits a handicap, sees matches re-seed; edits Holly hole data, sees stroke allocations update; posts a chat message; triggers an eagle auto-post by editing a score; locks a round.

### Phase 6 — Offline, polish, QA (checkpoint 6)

- [ ] Optimistic writes with retry queue on network failure
- [ ] "Unsynced" indicator in the TopNav when writes are pending
- [ ] Loading states on every data fetch (skeleton UIs, not spinners)
- [ ] Error boundaries on every route with a sensible fallback
- [ ] Empty states for every list (no rounds played, no chat messages, no matches played)
- [ ] All copy proofread for tone (dry, understated, no marketing speak)
- [ ] Lighthouse pass: mobile performance > 85, accessibility > 95
- [ ] Test all pages at 360px (iPhone SE), 390px (iPhone 14), 768px (iPad), 1440px (desktop)
- [ ] README updated with setup + handoff instructions

**Final checkpoint**: Reid runs a full dry-run — seeds realistic scores for all 3 days on a test environment and confirms the leaderboard, match pages, chat, and admin all work as expected.

---

## 16. Things I won't second-guess you on (use judgment)

- Specific shadcn component choices (Sheet vs Dialog for hole entry, Table vs custom scorecard grid, etc.)
- Exact animation timings / motion design
- Specific Lucide icon choices
- Skeleton loader implementations
- Error message copy (keep it dry and helpful)
- Form validation UX (react-hook-form patterns)
- Exact page meta / OG tags

Document anything you're unsure about in `DECISIONS.md`.

---

## 17. Things I will absolutely second-guess you on (do not deviate)

- The scoring math (§10) — must match the Excel tracker exactly. Write the tests first; they are the spec.
- The brand (§4) — Midnight Oak palette, N&P badge, typography pairing. No Augusta clichés.
- The tech stack (§2) — no substitutions.
- The data model (§6) — add columns if needed, but don't restructure.
- The RLS policies (§8) — no "wide open" shortcuts. A spectator cannot see the chat. A non-admin cannot edit another player's scores.
- Free tier only — no paid APIs, no premium services.

---

## 18. Definition of "done"

The app is done when:

1. All 6 phase checkpoints have been met.
2. All scoring tests pass.
3. Lighthouse mobile perf > 85 and a11y > 95 on the leaderboard and a score-entry page.
4. Reid has run a full dry-run and signed off.
5. README has complete setup + handoff docs.
6. `DECISIONS.md` has been reviewed.

Target completion: **by end of April 2026** to leave a full week of buffer before Day 1.

---

## 19. Appendix: Excel source material

For reference during dev, the original tracker is summarized here. If the TypeScript math ever disagrees with the Excel, the TypeScript wins (Excel values are locked per the v2 proposal, but the Excel may have rounding quirks not worth replicating).

**Day 1**: Win = 2 pts, Tie = 1 pt each. Net match play (total net). 20 pts possible.

**Day 2**: 2 pools of 5 entries each. Rank per pool. 1st = 5, 2nd = 3, 3rd = 1, 4th/5th = 0. 18 pts possible.

**Day 3**: Placement. 1st = 8, 2nd = 6, 3rd = 4, 4th = 2, 5th = 0. Plus 1 bonus pt per stroke under par. 20+ pts possible.

**Total**: 58+ pts across the tournament.

---

*End of brief.*
