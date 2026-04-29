import "server-only";
import { getDb, genId } from "@/lib/db";
import { getCurrentEventId } from "@/lib/repo/events";
import type { AuditLogRow } from "@/lib/types";

export function recordAudit(args: {
  playerId: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
}) {
  getDb()
    .prepare(
      "INSERT INTO audit_log (id, event_id, player_id, action, entity_type, entity_id, before_value, after_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      genId("al"),
      getCurrentEventId(),
      args.playerId,
      args.action,
      args.entityType ?? null,
      args.entityId ?? null,
      args.before === undefined ? null : JSON.stringify(args.before),
      args.after === undefined ? null : JSON.stringify(args.after),
    );
}

export function listRecentAudit(limit = 100): AuditLogRow[] {
  return getDb()
    .prepare(
      "SELECT * FROM audit_log WHERE event_id = ? ORDER BY occurred_at DESC LIMIT ?",
    )
    .all(getCurrentEventId(), limit) as AuditLogRow[];
}
