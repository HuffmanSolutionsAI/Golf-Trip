// Single-process better-sqlite3 connection with auto-schema + seed on first start.
// The DB file lives at DB_PATH (default ./data/invitational.db).

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

let _db: Database.Database | null = null;

function dbPath(): string {
  const p = process.env.DB_PATH ?? "./data/invitational.db";
  return path.resolve(p);
}

function readSql(file: string): string {
  const p = path.resolve(process.cwd(), "db", file);
  return fs.readFileSync(p, "utf8");
}

// Add a column to a table only if it isn't already there. SQLite has no
// `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, so we check pragma first.
function ensureColumn(
  db: Database.Database,
  table: string,
  column: string,
  ddl: string,
) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{
    name: string;
  }>;
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

function init(db: Database.Database) {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("synchronous = NORMAL");

  db.exec(readSql("schema.sql"));

  // Seed the canonical event row before any column migration runs — the
  // event_id default 'event-1' must point at a real row to satisfy the FK.
  db.exec(readSql("event-seed.sql"));

  // Backfill event_id onto pre-multi-tenant tables. Fresh installs already
  // declare these columns in schema.sql; this branch covers existing DBs
  // upgraded in place.
  ensureColumn(
    db,
    "teams",
    "event_id",
    "event_id TEXT NOT NULL DEFAULT 'event-1'",
  );
  ensureColumn(
    db,
    "players",
    "event_id",
    "event_id TEXT NOT NULL DEFAULT 'event-1'",
  );
  ensureColumn(
    db,
    "rounds",
    "event_id",
    "event_id TEXT NOT NULL DEFAULT 'event-1'",
  );
  ensureColumn(
    db,
    "chat_messages",
    "event_id",
    "event_id TEXT NOT NULL DEFAULT 'event-1'",
  );
  ensureColumn(
    db,
    "audit_log",
    "event_id",
    "event_id TEXT NOT NULL DEFAULT 'event-1'",
  );

  // Magic-link auth (Plan A · Phase 2). The new tables come from schema.sql;
  // these columns extend pre-existing tables on legacy DBs.
  ensureColumn(db, "players", "user_id", "user_id TEXT");
  ensureColumn(db, "players", "email", "email TEXT");
  ensureColumn(db, "sessions", "user_id", "user_id TEXT");

  // Legacy DBs created sessions.player_id as NOT NULL with no user_id
  // column. SQLite can't drop a NOT NULL constraint via ALTER, so detect
  // and rebuild. The new shape allows either player_id or user_id (XOR).
  const sessCols = db
    .prepare("PRAGMA table_info(sessions)")
    .all() as Array<{ name: string; notnull: number }>;
  const playerIdCol = sessCols.find((c) => c.name === "player_id");
  if (playerIdCol && playerIdCol.notnull === 1) {
    db.exec(`
      CREATE TABLE sessions_new (
        id         TEXT PRIMARY KEY,
        player_id  TEXT REFERENCES players(id) ON DELETE CASCADE,
        user_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL,
        CHECK ((player_id IS NOT NULL) + (user_id IS NOT NULL) = 1)
      );
      INSERT INTO sessions_new (id, player_id, user_id, created_at, expires_at)
        SELECT id, player_id, user_id, created_at, expires_at FROM sessions;
      DROP TABLE sessions;
      ALTER TABLE sessions_new RENAME TO sessions;
    `);
  }

  // Indexes that depend on Phase-2 columns. Created here so legacy DBs only
  // try to index the column after ensureColumn (and any rebuild) has run.
  db.exec(
    `CREATE INDEX IF NOT EXISTS sessions_player_idx ON sessions (player_id);
     CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);
     CREATE INDEX IF NOT EXISTS event_roles_user_idx ON event_roles (user_id);
     CREATE INDEX IF NOT EXISTS magic_link_tokens_email_idx ON magic_link_tokens (email);`,
  );

  // Seed only if teams table is empty.
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM teams").get() as { n: number };
  if (n === 0) {
    db.exec(readSql("seed.sql"));
  }

  // Idempotent bootstrap — runs every boot so existing DBs pick up additive
  // data (tee groups + default scorer assignments) without db:reset.
  db.exec(readSql("tee-groups-seed.sql"));
}

export function getDb(): Database.Database {
  if (_db) return _db;
  const p = dbPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const db = new Database(p);
  init(db);
  _db = db;
  return db;
}

// Convenience helpers
export function genId(prefix: string = ""): string {
  const id = (globalThis.crypto?.randomUUID?.() ?? fallbackUuid()).replaceAll("-", "");
  return prefix ? `${prefix}-${id.slice(0, 24)}` : id;
}

function fallbackUuid(): string {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function nowIso(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}
