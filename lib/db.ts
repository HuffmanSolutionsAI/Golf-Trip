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

function init(db: Database.Database) {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("synchronous = NORMAL");

  db.exec(readSql("schema.sql"));

  // Seed only if teams table is empty.
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM teams").get() as { n: number };
  if (n === 0) {
    db.exec(readSql("seed.sql"));
  }

  // Idempotent tee-time pairings seed — always run so existing DBs get the data.
  db.exec(readSql("seed-tee-times.sql"));
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
