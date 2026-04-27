# The Neal & Pam Invitational

Scoring web app for the May 7–9, 2026 tournament at Pinehurst. Built with Next.js 15, Supabase, and Tailwind v4 per `Claude_Code_Build_Brief.md`.

---

## Quick start — your one-time setup

You'll need accounts on:

- [Supabase](https://supabase.com) (free tier is fine)
- [Vercel](https://vercel.com) (free Hobby tier is fine)
- DNS access for `huffmanai.com` (to add the `np` CNAME)

### 1. Create the Supabase project

1. Go to https://supabase.com/dashboard → **New project**.
2. Name it `neal-pam-invitational`. Pick a region near you (us-east-1).
3. Save the password it generates somewhere safe.
4. Once provisioned, open **Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret)

### 2. Apply migrations + seed data

Open the Supabase SQL editor and run, in order, each file under `supabase/migrations/`:

1. `0001_extensions_and_helpers.sql`
2. `0002_teams_players.sql`
3. `0003_rounds_holes.sql`
4. `0004_matches.sql`
5. `0005_scramble.sql`
6. `0006_hole_scores.sql`
7. `0007_chat_audit.sql`
8. `0008_rls_policies.sql`
9. `0009_views.sql`
10. `0010_realtime.sql`

Then run `supabase/seed.sql` to load teams, players, holes, matches, and scramble entries.

> Tip: you can also apply everything at once with the Supabase CLI — `supabase db push` after linking the project.

### 3. Configure Supabase Auth

In the Supabase dashboard → **Authentication → URL Configuration**:

- **Site URL:** `https://np.huffmanai.com`
- **Additional redirect URLs:** add your Vercel preview URL + `http://localhost:3000`

In **Authentication → Providers → Email:** ensure "Enable email signups" is on. Turn off "Confirm email" (magic link is already email-verified and it's nicer to skip the extra email).

### 4. Run locally

```bash
cp .env.example .env.local
# Fill in the 4 Supabase vars + TRIP_PASSCODE and COMMISSIONER_EMAIL
pnpm install
pnpm dev
```

Open http://localhost:3000. Sign in with your email; you'll get a magic link. Click it, claim your slot (`Reid`) with the passcode `pinehurst2026` (default), and you should see `is_admin = true` on your player record.

### 5. Deploy to Vercel

1. Push this repo to GitHub (already done).
2. In Vercel → **New Project** → import the repo.
3. In **Environment Variables**, paste all 5 vars from `.env.example`.
4. Deploy. Vercel gives you a `*.vercel.app` URL.

### 6. Hook up `np.huffmanai.com`

In Vercel → **Project → Settings → Domains**, add `np.huffmanai.com`.

At your DNS provider, add this record:

```
Type:  CNAME
Name:  np
Value: cname.vercel-dns.com.
TTL:   300
```

Wait ~5 minutes. Vercel will issue the SSL cert automatically.

Update the Supabase **Site URL** to `https://np.huffmanai.com` once the cert lands.

---

## Day-of checklist (commissioner)

**Night before Day 1 (May 6)**

- [ ] Open `/admin → Holes → Day 1 · Pinewild Magnolia` — holes are placeholders. Fill in correct par + handicap_index from the pro shop card.
- [ ] Tap **Re-seed Day 1 matches** under `/admin → Players`. Handicaps will re-allocate strokes using the corrected Magnolia handicap_indexes.
- [ ] Confirm every player has signed in and claimed their slot — check `/admin → Players` for the "Claimed" column.

**Each morning**

- [ ] `/admin → Rounds` — make sure yesterday's round is Locked (this freezes points + posts the "Final" system message).
- [ ] Verify the first foursome can enter scores (one test score from each phone).

**End of day**

- [ ] Lock the current round. It posts "🔒 Day N · {format} · Final" to chat automatically.

---

## Architecture at a glance

```
Next.js 15 (App Router, RSC)
  ├── Landing / auth:   /, /auth/callback, /claim
  ├── Authed shell:     (app) layout with TopNav, Sidebar, BottomTabBar
  ├── Spectator leaderboard: /leaderboard (own layout; works signed-out)
  ├── Scoring pages:    /day1, /day2, /day3 (+ match / entry detail)
  ├── Chat:             /chat (realtime subscription)
  ├── Admin:            /admin (5 tabs)
  └── API:              /api/claim, /api/scores/*, /api/chat, /api/admin/*

Supabase (Postgres + Auth + Realtime)
  ├── Tables: teams, players, rounds, holes, matches, scramble_*,
  │            hole_scores, chat_messages, audit_log
  ├── Views:  v_round_progress, v_day1_match_state,
  │            v_day2_pool_ranks, v_day3_standings,
  │            v_team_points, v_leaderboard
  ├── RLS:    Spectator-read on tournament data, author-write on
  │           hole_scores (player or participant or admin),
  │           authenticated-only chat reads, admin-only audit reads
  └── Realtime: hole_scores, chat_messages, rounds, matches,
                 scramble_entries, players
```

All scoring math lives in `lib/scoring/` as pure functions with Vitest coverage. The SQL views are direct ports; if the two disagree, the TS tests are the spec.

### Scripts

```
pnpm dev         # local dev server on :3000
pnpm build       # production build
pnpm start       # run production build locally
pnpm typecheck   # tsc --noEmit
pnpm test        # vitest run (scoring engine)
pnpm test:watch  # vitest in watch mode
```

### Stack (per brief §2 — do not substitute)

- Next.js 15 (App Router, React Server Components, TypeScript strict)
- Tailwind CSS v4 (via `@tailwindcss/postcss`)
- shadcn-style primitives (`components/ui`) — hand-rolled since the full CLI isn't needed at this scale
- Supabase (Postgres + Auth + Realtime via `@supabase/ssr`)
- date-fns, lucide-react, zod, react-hook-form
- Vitest for scoring tests

---

## Branding (per brief §4)

Midnight Oak palette, N&P monogram badge (inline SVG at `components/brand/Badge.tsx`), stacked wordmark, Playfair Display / Cormorant Garamond / Inter / JetBrains Mono fonts. Team accent colors: Crimson `#A83232`, Forest `#2F5233`, Cobalt `#2D4E8A`, Amber `#B07324`, Plum `#5B2B4C`.

---

## Known gaps / next up

- Pinewild Magnolia hole-level data: placeholder, fill in via `/admin` before Day 1.
- The "tee-time alert" auto-post fires on any authed page load within 25–35 min of a tee time. On Vercel Hobby we can't run a real cron.
- No offline write queue yet — if a phone loses signal mid-entry, the save fails and the player sees an inline error. Phase 6 will add optimistic queuing + a retry indicator.

See `DECISIONS.md` for judgment calls made during the build.
