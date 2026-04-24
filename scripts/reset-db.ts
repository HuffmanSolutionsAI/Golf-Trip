// DANGER: wipes the SQLite DB file and re-initializes from schema + seed.
// Usage: pnpm db:reset

import fs from "node:fs";
import path from "node:path";

const p = path.resolve(process.env.DB_PATH ?? "./data/invitational.db");
for (const suffix of ["", "-wal", "-shm"]) {
  const file = p + suffix;
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log(`removed ${file}`);
  }
}
// Trigger re-init.
const { getDb } = await import("../lib/db");
const db = getDb();
const { n } = db.prepare("SELECT COUNT(*) AS n FROM teams").get() as { n: number };
console.log(`reset complete. ${n} teams seeded.`);
