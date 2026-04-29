import "server-only";
import crypto from "node:crypto";
import { getDb } from "@/lib/db";
import type { MagicLinkTokenRow } from "@/lib/types";

const TOKEN_BYTES = 32;
const TTL_MINUTES = 15;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Create a one-time token for an email. Returns the *raw* token (which goes
// in the magic link) and its expiry. Only the hash is stored, so a DB
// snapshot can't be used to forge logins. Existing unused tokens for the
// same email are invalidated to prevent token-stuffing.
export function createMagicLinkToken(args: {
  email: string;
  eventId?: string | null;
  nextPath?: string | null;
}): { token: string; expiresAt: Date } {
  const email = normalizeEmail(args.email);
  const token = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TTL_MINUTES * 60 * 1000);

  const db = getDb();
  // Invalidate prior unused tokens for this email so a replay window doesn't
  // grow indefinitely.
  db.prepare(
    `UPDATE magic_link_tokens
       SET used_at = datetime('now')
       WHERE email = ? AND used_at IS NULL`,
  ).run(email);

  db.prepare(
    `INSERT INTO magic_link_tokens
       (token_hash, email, event_id, next_path, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
  ).run(tokenHash, email, args.eventId ?? null, args.nextPath ?? null, expiresAt.toISOString());

  return { token, expiresAt };
}

// Look up a token, return its row if valid + unused + unexpired, otherwise
// null. Does NOT mark it consumed — that happens in markUsed() once the
// caller has actually issued the session.
export function findValidToken(token: string): MagicLinkTokenRow | null {
  const tokenHash = hashToken(token);
  const row = getDb()
    .prepare(`SELECT * FROM magic_link_tokens WHERE token_hash = ?`)
    .get(tokenHash) as MagicLinkTokenRow | undefined;
  if (!row) return null;
  if (row.used_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  return row;
}

export function markTokenUsed(tokenHash: string): void {
  getDb()
    .prepare(
      `UPDATE magic_link_tokens SET used_at = datetime('now') WHERE token_hash = ?`,
    )
    .run(tokenHash);
}
