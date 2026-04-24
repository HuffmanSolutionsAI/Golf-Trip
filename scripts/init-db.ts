// Initialize the SQLite database (idempotent).
// Usage: pnpm db:init

import { getDb } from "../lib/db";

const db = getDb();
const { n } = db.prepare("SELECT COUNT(*) AS n FROM teams").get() as { n: number };
const { p } = db.prepare("SELECT COUNT(*) AS p FROM players").get() as { p: number };
console.log(`DB ready. ${n} teams · ${p} players seeded.`);
