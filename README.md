# The Neal & Pam Invitational

Scoring web app for the May 7–9, 2026 tournament at Pinehurst. Runs entirely on a Mac mini: Next.js 15 + **local SQLite** + **Cloudflare Tunnel** for public access at `np.huffmanai.com`.

No Supabase, no external database, no SMTP. Everything lives in `./data/invitational.db`.

---

## Architecture

```
┌─────────────────────┐        Cloudflare Tunnel (outbound HTTPS)
│  np.huffmanai.com   │  ◄──────────────────────────────────────────┐
└─────────────────────┘                                             │
                                                           ┌────────┴─────────┐
                                                           │   Mac mini       │
                                                           │                  │
                                                           │  cloudflared ─┐  │
                                                           │               │  │
                                                           │  next start ◄─┘  │
                                                           │   │   127.0.0.1:3000
                                                           │   ▼              │
                                                           │   SQLite         │
                                                           │   ./data/*.db    │
                                                           └──────────────────┘
```

- **Next.js** serves the app on `127.0.0.1:3000` (loopback only — never exposed to the LAN).
- **better-sqlite3** reads/writes a single `./data/invitational.db` file (WAL mode).
- **Cloudflare Tunnel** (`cloudflared`) dials out to Cloudflare and proxies `np.huffmanai.com` → `127.0.0.1:3000`. You don't open any ports on your router.
- **Realtime** is in-process SSE — clients connect to `/api/events` and the server pushes change notifications in response to mutations.
- **Auth** is a simple name + trip passcode. Sessions are HMAC-signed cookies backed by a `sessions` row in SQLite (30-day expiry).

---

## First-time setup (on the mini)

### 1. Prerequisites

```bash
# Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node + pnpm + cloudflared
brew install node pnpm cloudflared
```

### 2. Clone + install

```bash
git clone https://github.com/HuffmanSolutionsAI/Golf-Trip.git
cd Golf-Trip
git checkout claude/build-golf-trip-app-iU5wg
pnpm install
pnpm approve-builds    # approve better-sqlite3 so it compiles
```

### 3. Env file

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```
TRIP_PASSCODE=pinehurst2026
SESSION_SECRET=<paste `openssl rand -hex 32` output here>
DB_PATH=./data/invitational.db
NEXT_PUBLIC_SITE_URL=https://np.huffmanai.com
```

### 4. Initialize the database

```bash
pnpm db:init
# "DB ready. 5 teams · 20 players seeded."
```

The DB file lives at `./data/invitational.db`. Back it up whenever — it's a plain SQLite file. `pnpm db:reset` wipes and re-seeds it from `db/schema.sql` + `db/seed.sql`.

### 5. Build + start

```bash
pnpm build
./scripts/start.sh
# → Next.js listening on http://127.0.0.1:3000
```

Hit `http://127.0.0.1:3000` from the mini's browser to confirm. You should land on the signin page; pick `Reid`, type the passcode, and you're in as commissioner.

### 6. Cloudflare Tunnel

```bash
cloudflared tunnel login                        # opens browser → pick huffmanai.com
cloudflared tunnel create np-invitational       # prints a UUID + saves creds JSON
cloudflared tunnel route dns np-invitational np.huffmanai.com
```

Copy the example config and fill in your UUID:

```bash
mkdir -p ~/.cloudflared
cp cloudflared/config.example.yml ~/.cloudflared/config.yml
# Edit ~/.cloudflared/config.yml — replace TUNNEL_UUID everywhere
```

Run it:

```bash
cloudflared tunnel run np-invitational
# → tunnel is now serving np.huffmanai.com
```

Done — `https://np.huffmanai.com` now serves the mini.

### 7. Auto-start at boot (optional but recommended)

Install the app via launchd:

```bash
cp cloudflared/com.neal-pam.invitational.plist ~/Library/LaunchAgents/
# Edit that plist first to replace /Users/YOU/ with your actual home dir.
launchctl load ~/Library/LaunchAgents/com.neal-pam.invitational.plist
```

And the tunnel:

```bash
sudo cloudflared service install
```

Now the mini boots, Next.js comes up automatically, cloudflared connects, and `np.huffmanai.com` is live — even after power cycles.

---

## Day-of checklist (commissioner)

**Night before Day 1 (May 6)**

- [ ] Open `/admin → Holes → Day 1 · Pinewild Holly` — holes are placeholders. Fill in correct par + handicap_index from the pro shop card.
- [ ] Tap **Re-seed Day 1 matches** under `/admin → Players`. Stroke allocations refresh using the corrected Holly handicap indexes.
- [ ] Verify the first foursome can enter scores (one test score from each phone).

**Each morning**

- [ ] `/admin → Rounds` — make sure yesterday's round is Locked (freezes points, posts the "Final" system message).

**End of day**

- [ ] Lock the current round. Chat auto-posts "🔒 Day N · {format} · Final".

**Backups**

The DB file is at `./data/invitational.db`. After each round, copy it somewhere off the mini:

```bash
cp data/invitational.db ~/Dropbox/np-backups/invitational-$(date +%F-%H%M).db
```

Or set a cron. Or just don't worry about it — a 20-player tournament fits in a ~200KB file.

---

## How it works

### Auth

There's no email / magic link. Players land on `/`, pick their name from the dropdown, type the trip passcode, and get a cookie good for 30 days.

- The passcode lives in `TRIP_PASSCODE`. If you change it mid-trip, everyone is kicked on their next page navigation.
- Sessions are signed with `SESSION_SECRET` using HMAC-SHA256. If you rotate the secret, everyone is kicked.
- `Reid` is flagged `is_admin = 1` in the seed, so whoever claims `Reid` has admin. You can transfer admin by editing `players.is_admin` in SQLite directly if you ever need to.

### Realtime

Any score write, chat post, or round lock calls `emitChange(kind)` on an in-process `EventEmitter`. The `/api/events` route holds open an SSE stream and forwards events to every connected browser. Clients run `router.refresh()` on relevant events.

SSE works fine through Cloudflare Tunnel — the config in `cloudflared/config.example.yml` sets keep-alive so idle streams don't drop.

### Data model

See `db/schema.sql`. The app-side repo layer (`lib/repo/*.ts`) wraps all read queries, and `lib/repo/standings.ts` runs the scoring engine from `lib/scoring/*` against the raw data to compute the leaderboard, match states, pool ranks, and Day 3 standings on demand.

All scoring math is covered by 36 Vitest tests in `lib/scoring/__tests__/`.

---

## Scripts

```
pnpm dev         # local dev server on :3000
pnpm build       # production build
pnpm start       # run production build locally
pnpm typecheck   # tsc --noEmit
pnpm test        # vitest run (scoring engine)
pnpm db:init     # ensure schema + seed (idempotent)
pnpm db:reset    # WIPE the DB file and re-seed

./scripts/start.sh  # boot the prod server for the mini
```

---

## Branding

Midnight Oak palette, N&P monogram badge (inline SVG at `components/brand/Badge.tsx`), stacked wordmark. Fonts: Playfair Display / Cormorant Garamond / Inter / JetBrains Mono.

Team accent colors: Crimson `#A83232`, Forest `#2F5233`, Cobalt `#2D4E8A`, Amber `#B07324`, Plum `#5B2B4C`.

See `DECISIONS.md` for judgment calls made during the build.
