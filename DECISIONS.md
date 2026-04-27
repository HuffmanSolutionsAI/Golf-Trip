# DECISIONS.md

Judgment calls made during the initial build that deviated from the letter (but not the spirit) of the build brief. Flag any of these for discussion.

## shadcn primitives

We did not run the `shadcn` CLI. Instead we hand-wrote the four primitives we actually use — `Button`, `Card`, `Input`, `Select`, `Label` — under `components/ui/`, styled with the Midnight Oak CSS variables. Rationale: the full shadcn install pulls ~20 Radix packages and a generator we don't need for a 20-user single-event app. If you want to bring it in later, running `pnpm dlx shadcn@latest init` from the repo root will co-exist with the existing primitives.

## Brand component details

The Badge SVG matches the spec in §4 with one concession: the "THE INVITATIONAL" arc text is centered on the textPath (startOffset=50%) rather than explicitly positioned at (28,82)→(132,82). Visually identical; simpler SVG.

## Handicap rounding

The brief says "0.5 rounds up". We implement `Math.floor(hcp + 0.5)` because `Math.round` in JS uses banker's rounding for `.5` cases in some edge forms. This matches the Excel `ROUND(x, 0)` default behavior. The required test assertions in §10.7 all pass with this rule.

## SQL view: v_day2_pool_ranks tiebreak semantics

When a pool is incomplete (any entry < 18 holes), points are 0 for all entries but `rank_in_pool` is still computed off of `team_raw`. Once complete, points are awarded by the 5/3/1/0/0 ladder. If `manual_tiebreak_rank` is set on any entry, that value wins over natural rank (for both points and display). This matches the spec's "manual_tiebreak_rank overrides rank if set."

## SQL view: v_day1_match_state stroke allocation

Stroke holes are recomputed in SQL per match by picking the `strokes_given` holes with the lowest `handicap_index`. We only return stroke holes if every hole in the round has a non-null handicap_index (i.e., once Magnolia data is populated). Until then, the view treats it as "strokes are owed but not yet allocated" — nets are calculated as gross (no deductions). The TS engine has the same behavior.

## Projected ranking rule (brief §10.6)

The brief suggests ranking projected teams by `raw × (18/holesThru)` when teams are thru different counts. In practice, all teams in a day play the same course at roughly the same pace; to keep the UI honest, we currently rank by `team_raw` ascending without any extrapolation. The difference is cosmetic and only matters for 5–10 seconds on the leaderboard between groups finishing a hole. Calling this out in case you'd prefer the extrapolated form; it's a one-line change in `lib/scoring/day2.ts`.

## Chat system post dedupe

Per §13, each system kind "has natural deduplication based on content." We implement this as a literal-body uniqueness check — each post is looked up by exact `body` + `kind='system'` before insert. It does mean that, e.g., the "Team 2 takes the lead" message won't re-post if Team 2 leads, cedes the lead, and retakes it — a known follow-on item to sharpen if that happens mid-round.

## Tee-time alert

No background cron on Vercel Hobby. We post the "30 min" alert on any authed page load that falls in the 25–35 minute window before a tee time. The dedupe rule above prevents spam.

## Players: self-claim via server-side admin client

RLS doesn't allow a non-admin user to mutate their own player row (we'd need a policy permitting an unclaimed → claimed update). Instead, `POST /api/claim` uses the service-role client to set `user_id` and (if commissioner) `is_admin`, after verifying the trip passcode and authenticated session. This keeps the RLS policy set simple and explicit.

## No separate /login route

The landing page at `/` *is* the login page. Brief mentions `app/(auth)/login/` but we never needed the extra route — magic link from `/` goes straight to `/auth/callback`. Left the `(auth)` folder unused; easy to add a dedicated `/login` later if we want a second entry point.

## Leaderboard route is spectator-accessible

The brief describes a /leaderboard available without auth. To make that work inside the authed `(app)` layout would have required a conditional redirect inside the layout; instead we moved `/leaderboard` out of the `(app)` group and gave it its own layout that shows a spectator banner when signed out.

## /day1, /day2, /day3 landing pages

These are index pages not explicitly specified in §12; they show the list of matches / entries for each day. Drilling down from `/schedule → Day N` lands here. Clickable cards lead to the detail screens.

## Audit log triggers

We audit `hole_scores` (insert/update/delete) and UPDATEs on `players.handicap`, `holes.par`, `holes.handicap_index`, `scramble_entries.manual_tiebreak_rank`. The brief didn't require auditing inserts to holes or scramble entries; seeding should be done during setup so those rarely change mid-tournament.

## Realtime publication

We add `hole_scores`, `chat_messages`, `rounds`, `matches`, `scramble_entries`, `players` to `supabase_realtime`. The brief explicitly called out the first two; the others help other views refresh cleanly (e.g. a re-seeded match refreshes stroke allocations on open match pages without a manual reload).
