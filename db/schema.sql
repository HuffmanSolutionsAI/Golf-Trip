-- SQLite schema. Idempotent: applied on first start, safe to re-run.
--
-- Multi-event aware. Every top-level entity (teams, players, rounds,
-- chat_messages, audit_log) belongs to exactly one event. The N&P
-- Invitational is the canonical first event with id='event-1'. On existing
-- single-tenant DBs, lib/db.ts adds the event_id column (default 'event-1')
-- and seeds event-1 before the rest of the schema is touched.

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ---------------------------------------------------------------------------
-- events — top-level container. The N&P Invitational is 'event-1'.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL,
  subtitle              TEXT,
  start_date            TEXT,
  end_date              TEXT,
  visibility            TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','unlisted','private')),
  commissioner_user_id  TEXT,
  handicap_source       TEXT NOT NULL DEFAULT 'manual' CHECK (handicap_source IN ('manual','ghin','whs')),
  brand_override_id     TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- brand_overrides — palette/wordmark/hero copy that an event can opt into.
-- Default presentation is the Clubhouse / Midnight-Oak look applied by the
-- app shell; this table holds named alternatives. The N&P Invitational pins
-- 'Editorial / Volume II' here.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brand_overrides (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  tokens_json TEXT NOT NULL,
  wordmark    TEXT,
  hero_copy   TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- teams
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teams (
  id            TEXT PRIMARY KEY,
  event_id      TEXT NOT NULL DEFAULT 'event-1' REFERENCES events(id),
  name          TEXT NOT NULL,
  display_color TEXT NOT NULL,
  sort_order    INTEGER NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- players
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS players (
  id         TEXT PRIMARY KEY,
  event_id   TEXT NOT NULL DEFAULT 'event-1' REFERENCES events(id),
  user_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  email      TEXT,
  name       TEXT NOT NULL UNIQUE,
  handicap   REAL NOT NULL,
  team_id    TEXT NOT NULL REFERENCES teams(id),
  team_slot  TEXT NOT NULL CHECK (team_slot IN ('A','B','C','D')),
  is_admin   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(team_id, team_slot)
);

-- ---------------------------------------------------------------------------
-- rounds
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rounds (
  id          TEXT PRIMARY KEY,
  event_id    TEXT NOT NULL DEFAULT 'event-1' REFERENCES events(id),
  day         INTEGER NOT NULL CHECK (day IN (1,2,3)),
  date        TEXT NOT NULL,            -- ISO date 'YYYY-MM-DD'
  course_name TEXT NOT NULL,
  total_par   INTEGER NOT NULL,
  format      TEXT NOT NULL CHECK (format IN ('singles','scramble_2man','scramble_4man')),
  tee_time    TEXT NOT NULL,            -- 'HH:MM:SS'
  is_locked   INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(event_id, day)
);

-- ---------------------------------------------------------------------------
-- holes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS holes (
  id             TEXT PRIMARY KEY,
  round_id       TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  hole_number    INTEGER NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  par            INTEGER NOT NULL CHECK (par BETWEEN 3 AND 5),
  handicap_index INTEGER CHECK (handicap_index BETWEEN 1 AND 18),
  yardage        INTEGER,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(round_id, hole_number)
);

-- ---------------------------------------------------------------------------
-- matches (Day 1 singles)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matches (
  id              TEXT PRIMARY KEY,
  round_id        TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  match_number    INTEGER NOT NULL CHECK (match_number BETWEEN 1 AND 10),
  player1_id      TEXT NOT NULL REFERENCES players(id),
  player2_id      TEXT NOT NULL REFERENCES players(id),
  stroke_giver_id TEXT REFERENCES players(id),
  strokes_given   INTEGER NOT NULL DEFAULT 0 CHECK (strokes_given BETWEEN 0 AND 11),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(round_id, match_number),
  CHECK (player1_id <> player2_id)
);

-- ---------------------------------------------------------------------------
-- scramble_entries / participants
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scramble_entries (
  id                   TEXT PRIMARY KEY,
  round_id             TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  team_id              TEXT NOT NULL REFERENCES teams(id),
  pool                 TEXT CHECK (pool IN ('AD','BC')),
  manual_tiebreak_rank INTEGER,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(round_id, team_id, pool)
);

CREATE TABLE IF NOT EXISTS scramble_participants (
  scramble_entry_id TEXT NOT NULL REFERENCES scramble_entries(id) ON DELETE CASCADE,
  player_id         TEXT NOT NULL REFERENCES players(id),
  PRIMARY KEY (scramble_entry_id, player_id)
);

-- ---------------------------------------------------------------------------
-- hole_scores
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hole_scores (
  id                TEXT PRIMARY KEY,
  round_id          TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id         TEXT REFERENCES players(id),
  scramble_entry_id TEXT REFERENCES scramble_entries(id) ON DELETE CASCADE,
  hole_number       INTEGER NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  strokes           INTEGER NOT NULL CHECK (strokes BETWEEN 1 AND 15),
  entered_by        TEXT NOT NULL REFERENCES players(id),
  entered_at        TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK ((player_id IS NOT NULL) + (scramble_entry_id IS NOT NULL) = 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS hole_scores_player_round_hole_unique
  ON hole_scores (player_id, round_id, hole_number)
  WHERE player_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS hole_scores_scramble_hole_unique
  ON hole_scores (scramble_entry_id, hole_number)
  WHERE scramble_entry_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- chat_messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
  id        TEXT PRIMARY KEY,
  event_id  TEXT NOT NULL DEFAULT 'event-1' REFERENCES events(id),
  player_id TEXT REFERENCES players(id),
  body      TEXT NOT NULL,
  kind      TEXT NOT NULL DEFAULT 'human' CHECK (kind IN ('human','system')),
  posted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS chat_messages_posted_at_idx ON chat_messages (posted_at DESC);

-- ---------------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id           TEXT PRIMARY KEY,
  event_id     TEXT NOT NULL DEFAULT 'event-1' REFERENCES events(id),
  player_id    TEXT REFERENCES players(id),
  action       TEXT NOT NULL,
  entity_type  TEXT,
  entity_id    TEXT,
  before_value TEXT,      -- JSON-encoded
  after_value  TEXT,      -- JSON-encoded
  occurred_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS audit_log_occurred_at_idx ON audit_log (occurred_at DESC);

-- ---------------------------------------------------------------------------
-- users — auth identity. One user can play in many events. Magic-link auth
-- (Plan A · Phase 2) creates a row per email. The legacy passcode flow for
-- the N&P Invitational still operates via session.player_id; new sessions
-- created by magic-link store session.user_id instead.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  email        TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- event_roles — per-event grants. Spectator is implicit for public events
-- (no row needed); rows here represent commissioners / scorers / players.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_roles (
  event_id   TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('commissioner','scorer','player','spectator')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (event_id, user_id)
);

-- ---------------------------------------------------------------------------
-- magic_link_tokens — short-lived tokens emailed to users. The token value
-- is stored as sha256(token) so a DB leak doesn't yield active tokens.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS magic_link_tokens (
  token_hash TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  event_id   TEXT REFERENCES events(id) ON DELETE SET NULL,
  next_path  TEXT,
  expires_at TEXT NOT NULL,
  used_at    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- sessions — either a player session (legacy passcode flow) or a user
-- session (magic-link). Exactly one of player_id / user_id is set on rows
-- created by Phase 2 onwards. Legacy rows (created before Phase 2) have
-- player_id NOT NULL and user_id NULL; the CHECK is enforced only on
-- fresh installs (legacy DBs use the old schema with player_id NOT NULL
-- and no constraint on user_id, which is added by ensureColumn).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  player_id  TEXT REFERENCES players(id) ON DELETE CASCADE,
  user_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  CHECK ((player_id IS NOT NULL) + (user_id IS NOT NULL) = 1)
);

CREATE INDEX IF NOT EXISTS sessions_player_idx ON sessions (player_id);

-- ---------------------------------------------------------------------------
-- tee_groups — foursomes that go off together at a tee time. Each group
-- has a designated scorer who is the only non-admin allowed to enter scores
-- for the matches/scramble entries owned by the group. Day 1 groups own 2
-- matches each; Day 2 groups own 2 scramble entries (AD + BC pair); Day 3
-- groups own 1 entry (the team's 4-man scramble).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tee_groups (
  id               TEXT PRIMARY KEY,
  round_id         TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  group_number     INTEGER NOT NULL,
  scheduled_time   TEXT,                                  -- 'HH:MM:SS'
  scorer_player_id TEXT REFERENCES players(id),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(round_id, group_number)
);

CREATE TABLE IF NOT EXISTS tee_group_matches (
  tee_group_id TEXT NOT NULL REFERENCES tee_groups(id) ON DELETE CASCADE,
  match_id     TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  PRIMARY KEY (tee_group_id, match_id),
  UNIQUE (match_id)
);

CREATE TABLE IF NOT EXISTS tee_group_entries (
  tee_group_id      TEXT NOT NULL REFERENCES tee_groups(id) ON DELETE CASCADE,
  scramble_entry_id TEXT NOT NULL REFERENCES scramble_entries(id) ON DELETE CASCADE,
  PRIMARY KEY (tee_group_id, scramble_entry_id),
  UNIQUE (scramble_entry_id)
);
