// DANGER: wipes the SQLite DB file and re-initializes from schema + seed.
// Usage: pnpm db:reset

import fs from "node:fs";
import path from "node:path";
import { getDb } from "../lib/db";

const p = path.resolve(process.env.DB_PATH ?? "./data/invitational.db");
for (const suffix of ["", "-wal", "-shm"]) {
  const file = p + suffix;
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log(`removed ${file}`);
  }
}
// getDb() is lazy — connecting here triggers schema + seed on the fresh file.
const db = getDb();
const { n } = db.prepare("SELECT COUNT(*) AS n FROM teams").get() as { n: number };
const { p: players } = db.prepare("SELECT COUNT(*) AS p FROM players").get() as { p: number };
console.log(`reset complete. ${n} teams · ${players} players seeded.`);
