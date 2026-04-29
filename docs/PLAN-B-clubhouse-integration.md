# Plan B — Integrate the Event Engine into Playclubhouse

> **Decision.** This is **Option 1: tight integration**. The event engine
> from Plan A becomes a *feature* of the Playclubhouse app — not a separate
> service, not a sibling app behind a shared login. One codebase, one
> deploy, one nav, one identity, one design system. Events live in
> Clubhouse the same way "Rounds" or "Lessons" or any other primary
> Clubhouse surface does.

> **Brand authority.** The brand documents in the `playclubhouse` repo
> are canonical. This plan defers to them everywhere they conflict with
> the N&P Invitational's current Volume II visual language.

---

## 1. Why Option 1 (and not the alternatives)

| | Tight integration (chosen) | Sibling apps + SSO | Embed via iframe / API |
|---|---|---|---|
| One sign-in | ✓ | ✓ (with infra cost) | ✓ |
| Shared design system out of the box | ✓ | ✗ (must duplicate) | ✗ |
| Cross-feature data (Clubhouse round → Event) | ✓ | hard | hard |
| Operational simplicity | ✓ | two deploys | two deploys + bridge |
| Marketing story ("one stop shop") | ✓ | weakened | weakened |

The user's stated goal — "Playclubhouse should be a one-stop shop for all
your golf content" — only really lands under Option 1. Anything else
fragments the brand.

---

## 2. The naming: "My Events"

Throughout Clubhouse, the feature is **Events** (formerly "Trips" in
earlier drafts; do not use "trip" anywhere in user-facing copy). The
authenticated user's hub is **My Events**.

| surface | label |
|---|---|
| left-nav item | **Events** |
| user dashboard tile | **My Events** |
| empty state | "You haven't joined any events yet." |
| primary CTA | "Create an event" |
| sub-noun | "round" inside an event keeps the existing meaning |

Internally, the database table is `event`, the route prefix is `/events`,
and the slug is the public URL (`clubhouse.app/events/np-invitational-2026`).

---

## 3. Brand alignment with playclubhouse

The `playclubhouse` repo holds the canonical brand documents (palette,
typography, voice, logo lockups). **Those documents win** wherever the
N&P-only design and Clubhouse design disagree. Concretely:

1. **Default theme = Clubhouse.** A new event inherits Clubhouse's palette,
   typography, components, and motion — not the Midnight Oak / Volume II
   look. Clubhouse-branded events should feel like Clubhouse, full stop.
2. **Optional branding overrides per event.** Commissioners can opt into
   per-event branding: palette tokens, wordmark, hero treatment, optional
   custom-domain alias. Branding overrides feed the same `@theme` token
   layer, so they can't break Clubhouse's grid or component contracts.
3. **N&P Invitational becomes the reference custom brand.** The Midnight
   Oak palette, DM Serif Italic / Tinos / Inter / JetBrains stack, paper
   grain, and gold rules ship as the **first preset override** —
   "Editorial / Volume II" — so any event can adopt that look. It's a
   showcase of what's possible, not the default.
4. **Brand-doc adherence.** Anywhere this plan describes UI, the
   implementation must consult the playclubhouse brand documents first
   (component library, color tokens, type scale, voice/tone). When in
   doubt, match Clubhouse.

---

## 4. Where Events fits in Clubhouse IA

```
Clubhouse top nav
├── Home (existing)
├── Rounds (existing — your personal scoring history)
├── Events ← NEW
│    ├── My Events
│    ├── Discover (public events you might watch)
│    └── Create event
├── Coaching / Lessons (existing)
└── Profile (existing — handicap, friends)
```

A user's Clubhouse profile already carries handicap and identity.
Events reuses that profile — no duplicate fields, no parallel "tournament
profile" concept.

---

## 5. Identity: one user, many roles per event

Clubhouse's existing user model is the source of truth. Per-event roles
attach to it:

```
event_role (event_id, user_id, role)
  role ∈ { commissioner, scorer, player, spectator }
```

- **Commissioner**: creator of the event, full CRUD.
- **Scorer**: assigned per tee group (existing model), can write scores
  for that group only.
- **Player**: claimed via email match or invite link; visible on roster.
- **Spectator**: implicit for public events; no row needed.

Public events are readable without login. Authenticated reads upgrade the
experience (your team highlighted, your matches starred, your wagers
tallied).

---

## 6. Data integration with Clubhouse

Clubhouse already models golf objects we'd otherwise reinvent. Reuse them:

| Clubhouse object (assumed to exist) | Reused for events |
|---|---|
| `user` | event participants, commissioners, scorers |
| `course` library | event rounds reference Clubhouse courses |
| `handicap` (manual entry) | event handicaps come from the user's Clubhouse profile by default; commissioner can override per event |
| `round` (personal score history) | optional: an event round can write back to a player's personal history |

Reciprocally, Events emits useful telemetry to Clubhouse:

- An event round becomes a personal `round` for each player (with the
  event tagged) — so users see "Played Pinewild, 4/29/26, +6 net, N&P
  Invitational Day I" in their normal Rounds feed.
- Wagering history attaches to the user (lifetime skins won, etc.) for
  fun stats.

---

## 7. Format engine, lifted from Plan A

The format plugin contract from Plan A (`§3`) ports verbatim. Plugins
live in `apps/clubhouse/src/features/events/formats/` (or wherever
Clubhouse's feature-folder convention puts them). The first three:

- `match-play-net` (Day 1 format)
- `scramble-pair` (Day 2 format)
- `scramble-team` (Day 3 format)

…are direct ports of the existing `lib/scoring/day{1,2,3}.ts`. New
formats land as additional plugin files.

---

## 8. Wagering & side bets

In scope, same shape as Plan A §7: skins, presses, closest-to-pin, long
drive, calcutta, custom side bets. Inside Clubhouse, wagering shows up:

- On the event page as a "Wagering" tab.
- On the user's profile as a small lifetime wagering tally.
- (Stretch) In a Clubhouse-wide "Skins" leaderboard across all public
  events the user has joined.

No real-money handling in v1. Ledger only.

---

## 9. Handicap sources

The commissioner picks per event:

1. **Clubhouse profile handicap** — default. The user's handicap as
   Clubhouse already tracks it.
2. **Manual override per event** — commissioner sets a number that takes
   precedence for this event only.

Live syncing from a handicap provider (GHIN, WHS) was on the original
roadmap but is **deferred indefinitely** — there's no documented public
GHIN API, and the unofficial endpoints sit in TOS-grey territory.
We'll revisit if a clean integration path opens up. Until then, the
commissioner can copy authoritative indices from the source of truth
into Clubhouse profile or the per-event override.

---

## 10. Public event URLs

Public read-only access works without a Clubhouse account:

- `clubhouse.app/events/<slug>` — event home
- `clubhouse.app/events/<slug>/leaderboard` — live leaderboard via SSE
- `clubhouse.app/events/<slug>/day/[n]` — per-round group lists
- `clubhouse.app/events/<slug>/wagering` — side-bet ledger
- `clubhouse.app/events/<slug>/players` — roster

Authenticated routes (writes only):

- `clubhouse.app/events/<slug>/admin/*` — commissioner
- `clubhouse.app/events/<slug>/score/*` — scorer

Optional vanity domains (`np2026.example.com`) CNAME to a Clubhouse
subdomain that injects the event's branding override.

---

## 11. Migration path: Golf-Trip → Clubhouse

We do this in two phases so the live N&P site never goes dark.

### Phase 1 — port

1. **Stand up the Events feature inside Clubhouse** alongside existing
   features. New code path; doesn't touch the Golf-Trip repo yet.
2. **Lift the schema.** SQL → whatever Clubhouse's storage layer is
   (Postgres if Clubhouse runs Postgres). All entities prefixed with
   `event_` to namespace cleanly within Clubhouse's DB.
3. **Lift the scoring math** (`lib/scoring/*`) and tee-group repo
   (`lib/repo/teeGroups.ts`) verbatim. Pure functions, easy port.
4. **Lift the SSE realtime channel** to Clubhouse's existing realtime
   transport (websocket / pusher / whatever Clubhouse uses); fall back to
   SSE if Clubhouse hasn't picked one yet.
5. **Lift the components**, restyled to match Clubhouse's design system.
   The Volume II look becomes the "Editorial" preset.

### Phase 2 — switch over

1. **Import the N&P Invitational** as the first event in Clubhouse,
   preserving every match, scramble entry, tee group, scorer, and score.
2. **Set N&P's brand override** to "Editorial / Volume II" so it keeps
   its visual identity inside Clubhouse.
3. **Redirect** `np.huffmanai.com` → `clubhouse.app/events/np-invitational-2026`
   (or keep the vanity domain pointed at Clubhouse with the override
   applied — same outcome).
4. **Archive** the standalone Golf-Trip repo (read-only) once the live
   site is fully served from Clubhouse.

---

## 12. Cross-feature wins

Worth calling out — these only exist if we go Option 1:

- **One profile, many roles.** A user can be a commissioner of one event,
  a scorer in another, a spectator in a third — all on one identity.
- **Friends and invites reuse Clubhouse's social graph.** Invite by
  Clubhouse handle, not by email blast.
- **Practice rounds count.** A round you played at Pinewild last summer
  shows up in your Clubhouse history; when you join the N&P Invitational
  there, the app can surface "you've played here before, here's how you
  scored".
- **Coaching tie-in.** A pro reviewing a student's Clubhouse history
  sees their tournament rounds tagged with the event, format, and
  handicap-context.
- **Discover tab.** Public events show up in a Clubhouse-wide directory
  — golfers find tournaments to follow without leaving the app.

---

## 13. What we explicitly are NOT building

- A standalone "Golf Trip" sibling product. The repo's standalone life
  ends with the migration.
- A separate auth / identity surface. Clubhouse's auth is the only auth.
- A separate design system. Clubhouse's components are the only
  components; per-event branding is theme tokens on top.
- Native apps. Web-responsive only, in line with Plan A.
- Real-money payments in v1. Wagering ledger only.

---

## 14. Open questions for the playclubhouse team

These need confirming against the actual `playclubhouse` repo before
implementation begins:

1. **Backend stack?** Confirm DB (Postgres? Drizzle? Prisma?) and
   realtime transport (websockets? pusher?). The current repo uses SQLite
   + SSE; we conform to whatever Clubhouse uses.
2. **Auth provider?** Clerk / NextAuth / custom? The event role grants
   attach to whatever user model exists.
3. **Course library?** Does Clubhouse already model courses with
   ratings/slope per tee box? If yes, reuse. If no, contribute the
   library from Plan A §4 to Clubhouse.
4. **Brand documents.** Where in `playclubhouse` are the canonical brand
   docs (palette tokens, type scale, voice)? Surface them; this plan
   defers to them.

The answers to these turn this plan from "direction" into "scoped
tickets".
