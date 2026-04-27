import "server-only";
import { getDb, genId } from "@/lib/db";
import type { ChatMessageRow } from "@/lib/types";

export function listRecentMessages(limit = 500): ChatMessageRow[] {
  return getDb()
    .prepare("SELECT * FROM chat_messages ORDER BY posted_at ASC LIMIT ?")
    .all(limit) as ChatMessageRow[];
}

export function listRecentMessagesDesc(limit = 3): ChatMessageRow[] {
  return getDb()
    .prepare("SELECT * FROM chat_messages ORDER BY posted_at DESC LIMIT ?")
    .all(limit) as ChatMessageRow[];
}

export function insertHumanMessage(playerId: string, body: string): ChatMessageRow {
  const id = genId("msg");
  getDb()
    .prepare(
      "INSERT INTO chat_messages (id, player_id, body, kind) VALUES (?, ?, ?, 'human')",
    )
    .run(id, playerId, body);
  return getDb().prepare("SELECT * FROM chat_messages WHERE id = ?").get(id) as ChatMessageRow;
}

export function insertSystemMessageIfNew(body: string): boolean {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM chat_messages WHERE body = ? AND kind = 'system' LIMIT 1")
    .get(body);
  if (existing) return false;
  db.prepare(
    "INSERT INTO chat_messages (id, player_id, body, kind) VALUES (?, NULL, ?, 'system')",
  ).run(genId("msg"), body);
  return true;
}
