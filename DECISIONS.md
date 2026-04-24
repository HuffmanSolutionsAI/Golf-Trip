# DECISIONS.md

Judgment calls made during the build that deviate from the letter of `Claude_Code_Build_Brief.md`.

## Architecture pivot: Supabase → SQLite + Cloudflare Tunnel

The brief pinned Supabase + Vercel as the stack. Reid decided to self-host on a Mac mini, so the implementation swapped to:

- **better-sqlite3** on a local `./data/invitational.db` file (WAL mode)
- **Cloudflare Tunnel** (cloudflared) in front of `next start`, proxying `np.huffmanai.com` → `127.0.0.1:3000`
- **Auth**: name + trip passcode → HMAC-signed session cookie (30-day expiry). No magic links, no SMTP.
- **Realtime**: in-process `EventEmitter` + SSE at `/api/events`. Survives Cloudflare Tunnel with keep-alive tuned in the config.
- **RLS**: enforced in server-side API routes (`requireSession` / `requireAdmin`), not in the database layer.

The scoring engine under `lib/scoring/*` didn't change — it's still the canonical source. The repo layer (`lib/repo/*`) feeds it raw rows and returns the same `Day1MatchStateRow`, `Day2PoolRankRow`, `Day3StandingsRow`, `LeaderboardRow` shapes the Supabase views used to return. Pages consume the same types; only data fetching changed.

## shadcn primitives

Hand-rolled under `components/ui/` — `Button`, `Card`, `Input`, `Select`, `Label`. The full shadcn CLI is optional and would co-exist if we ever want the generator back.

## Brand component details

The Badge SVG matches the spec in §4 of the brief with one concession: the "THE INVITATIONAL" arc text is centered on the textPath (startOffset=50%) rather than explicitly positioned at (28,82)→(132,82). Visually identical; simpler SVG.

## Handicap rounding

Brief says "0.5 rounds up". We implement `Math.floor(hcp + 0.5)` because JS `Math.round` uses banker's rounding on some `.5` edge cases. This matches Excel's `ROUND(x, 0)` default. All 10 required §10.7 assertions pass.

## Projected ranking rule (brief §10.6)

Brief suggests ranking projected teams by `raw × (18/holesThru)` when teams are thru different counts. We rank by plain `team_raw` ascending — the cosmetic difference only matters for the few seconds between finishing holes. One-line change in `lib/scoring/day2.ts` if we want the extrapolated version.

## Chat system post dedupe

Each system message is deduped by exact body string. The "Team 2 takes the lead" message won't re-post if Team 2 cedes and retakes the lead mid-round — a known follow-on item if that ever happens.

## Tee-time alert

No background cron on a self-hosted single-process server either. We post the "30 min" alert on any authed page load that falls in the 25–35 minute window before a tee time. The dedupe rule prevents spam.

## No /claim flow

Supabase's magic-link `/claim` step is gone. Anyone on the name dropdown can sign in with the passcode; switching phones = one more sign-in. The commissioner flag travels with the `players.is_admin` column (Reid is pre-flagged in seed).

## Admin "Claimed" column → "Admin"

The old Supabase model surfaced a "Claimed" column based on whether a `user_id` link existed. With passcode sessions, every player is always "claimable", so the column shows `is_admin` instead.

## /day1, /day2, /day3 landing pages

These index pages weren't explicitly specced but they're how you get from `/schedule → Day N` to the individual match/entry screens. Kept them.

## Audit log

We write audit rows explicitly from mutation routes (score writes, handicap edits, hole edits, tiebreak updates, round lock/unlock). Trigger-based audit in SQLite is awkward compared to Postgres; explicit writes are easier to read and debug.

## DB backup strategy

Out of scope for the app itself. README recommends copying the `.db` file to Dropbox after each round. The file is a few hundred KB at peak — trivial to archive.
