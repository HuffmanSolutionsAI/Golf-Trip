import { getDb } from "@/lib/db";
import type { EventRow, BrandOverrideRow } from "@/lib/types";

// The single canonical event id for v1. Every repo / API route resolves the
// active event through getCurrentEventId() so we can swap this out for a
// request-scoped lookup (path slug, subdomain, etc) without rippling
// signature changes through the codebase. See docs/PLAN-A-event-engine.md.
export const DEFAULT_EVENT_ID = "event-1";

export function getCurrentEventId(): string {
  return DEFAULT_EVENT_ID;
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
