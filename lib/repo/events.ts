import { AsyncLocalStorage } from "node:async_hooks";
import { getDb } from "@/lib/db";
import type { EventRow, BrandOverrideRow } from "@/lib/types";

// Default event when no request scope is active. Existing top-level routes
// (the N&P Invitational at /, /leaderboard, /day1, etc.) resolve to this.
// Routes under /events/<slug>/* override it via runWithEvent().
export const DEFAULT_EVENT_ID = "event-1";

const eventStore = new AsyncLocalStorage<{ eventId: string }>();

// Run a function — sync or async — in a request scope where
// getCurrentEventId() returns the given event id. AsyncLocalStorage
// propagates through awaits, so async data-fetching inside the callback
// resolves against the right event without per-call plumbing.
export function runWithEvent<T>(eventId: string, fn: () => T): T {
  return eventStore.run({ eventId }, fn);
}

export function getCurrentEventId(): string {
  return eventStore.getStore()?.eventId ?? DEFAULT_EVENT_ID;
}

export function listEvents(): EventRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM events ORDER BY COALESCE(start_date, created_at) DESC`,
    )
    .all() as EventRow[];
}

export function getEventById(id: string): EventRow | null {
  const db = getDb();
  return (
    (db.prepare(`SELECT * FROM events WHERE id = ?`).get(id) as EventRow) ??
    null
  );
}

export function getCurrentEvent(): EventRow | null {
  return getEventById(getCurrentEventId());
}

export function getBrandOverride(id: string): BrandOverrideRow | null {
  const db = getDb();
  return (
    (db
      .prepare(`SELECT * FROM brand_overrides WHERE id = ?`)
      .get(id) as BrandOverrideRow) ?? null
  );
}
