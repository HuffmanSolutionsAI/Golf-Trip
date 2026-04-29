import "server-only";
import { getDb } from "@/lib/db";
import type { EventRoleRow } from "@/lib/types";

export type Role = "commissioner" | "scorer" | "player" | "spectator";

// Role precedence — higher index dominates. A user who is both 'player' and
// 'commissioner' on the same event reports as 'commissioner'.
const PRECEDENCE: Role[] = ["spectator", "player", "scorer", "commissioner"];

function maxRole(roles: Role[]): Role | null {
  if (roles.length === 0) return null;
  let best: Role = roles[0];
  for (const r of roles) {
    if (PRECEDENCE.indexOf(r) > PRECEDENCE.indexOf(best)) best = r;
  }
  return best;
}

// Look up a user's role on an event. Returns null if no grant exists; public
// events implicitly treat everyone as a spectator at the route level — that
// implicit-ness is NOT modeled here so callers can distinguish "logged-in
// stranger" from "explicit spectator grant".
export function getRole(userId: string, eventId: string): Role | null {
  const rows = getDb()
    .prepare(
      `SELECT role FROM event_roles WHERE user_id = ? AND event_id = ?`,
    )
    .all(userId, eventId) as Pick<EventRoleRow, "role">[];
  return maxRole(rows.map((r) => r.role));
}

export function hasRole(
  userId: string,
  eventId: string,
  needed: Role,
): boolean {
  const r = getRole(userId, eventId);
  if (!r) return false;
  return PRECEDENCE.indexOf(r) >= PRECEDENCE.indexOf(needed);
}

export function isCommissioner(userId: string, eventId: string): boolean {
  return getRole(userId, eventId) === "commissioner";
}

// Idempotent role grant. If the (event, user) row already exists at a
// strictly higher precedence, leave it alone; otherwise upsert to `role`.
export function assignRole(
  userId: string,
  eventId: string,
  role: Role,
): void {
  const db = getDb();
  const existing = db
    .prepare(
      `SELECT role FROM event_roles WHERE event_id = ? AND user_id = ?`,
    )
    .get(eventId, userId) as Pick<EventRoleRow, "role"> | undefined;
  if (existing) {
    if (PRECEDENCE.indexOf(role) > PRECEDENCE.indexOf(existing.role)) {
      db.prepare(
        `UPDATE event_roles SET role = ? WHERE event_id = ? AND user_id = ?`,
      ).run(role, eventId, userId);
    }
    return;
  }
  db.prepare(
    `INSERT INTO event_roles (event_id, user_id, role) VALUES (?, ?, ?)`,
  ).run(eventId, userId, role);
}

export function revokeRole(userId: string, eventId: string): void {
  getDb()
    .prepare(`DELETE FROM event_roles WHERE event_id = ? AND user_id = ?`)
    .run(eventId, userId);
}

// All event ids the user has any explicit grant on, with the resolved role.
export function listEventsForUser(
  userId: string,
): { event_id: string; role: Role }[] {
  const rows = getDb()
    .prepare(
      `SELECT event_id, role FROM event_roles WHERE user_id = ? ORDER BY event_id`,
    )
    .all(userId) as { event_id: string; role: Role }[];
  return rows;
}
