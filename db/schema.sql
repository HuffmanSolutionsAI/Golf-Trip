-- SQLite schema for the N&P Invitational.
-- Idempotent: applied on first start, safe to re-run.

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ---------------------------------------------------------------------------
-- teams
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teams (
  id            TEXT PRIMARY KEY,
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
  day         INTEGER NOT NULL UNIQUE CHECK (day IN (1,2,3)),
  date        TEXT NOT NULL,            -- ISO date 'YYYY-MM-DD'
  course_name TEXT NOT NULL,
  total_par   INTEGER NOT NULL,
  format      TEXT NOT NULL CHECK (format IN ('singles','scramble_2man','scramble_4man')),
  tee_time    TEXT NOT NULL,            -- 'HH:MM:SS'
  is_locked   INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
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
-- tee_time_groups — who tees off together each day. Each round has 5 groups
-- of 4 players. Independent of match/scramble groupings (e.g. Day 3 teams
-- score together but may be split across tee times for pace of play).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tee_time_groups (
  id           TEXT PRIMARY KEY,
  round_id     TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  group_number INTEGER NOT NULL CHECK (group_number BETWEEN 1 AND 5),
  position     INTEGER NOT NULL CHECK (position BETWEEN 1 AND 4),
  player_id    TEXT NOT NULL REFERENCES players(id),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(round_id, group_number, position),
  UNIQUE(round_id, player_id)
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
-- sessions (our own, since no Supabase auth)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  player_id  TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_player_idx ON sessions (player_id);
