import "server-only";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { getDb, genId, nowIso } from "@/lib/db";
import type { PlayerRow, SessionRow, TeamRow } from "@/lib/types";

const COOKIE_NAME = "np_session";
const SESSION_DAYS = 30;

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "SESSION_SECRET must be set to a 32+ char random value in .env.local",
    );
  }
  return s;
}

function sign(token: string): string {
  return crypto.createHmac("sha256", getSecret()).update(token).digest("hex");
}

function pack(sessionId: string): string {
  return `${sessionId}.${sign(sessionId)}`;
}

function unpack(cookieValue: string): string | null {
  const [sessionId, sig] = cookieValue.split(".");
  if (!sessionId || !sig) return null;
  const expected = sign(sessionId);
  // Constant-time compare
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  return sessionId;
}

/** Verify passcode and open a session for the given player. Returns the signed cookie value. */
export function openSession(playerId: string): { cookieValue: string; expiresAt: Date } {
  const db = getDb();
  const sessionId = genId("sess");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  db.prepare(
    "INSERT INTO sessions (id, player_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
  ).run(sessionId, playerId, nowIso(), expiresAt.toISOString());
  return { cookieValue: pack(sessionId), expiresAt };
}

export function closeSession(sessionId: string) {
  getDb().prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
}

export async function readSessionCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export async function setSessionCookie(value: string, expiresAt: Date) {
  const store = await cookies();
  store.set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", { expires: new Date(0), path: "/" });
}

export async function getCurrentPlayer(): Promise<(PlayerRow & { team: TeamRow }) | null> {
  const raw = await readSessionCookie();
  if (!raw) return null;
  const sessionId = unpack(raw);
  if (!sessionId) return null;
  const db = getDb();
  const session = db
    .prepare("SELECT * FROM sessions WHERE id = ?")
    .get(sessionId) as SessionRow | undefined;
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
    return null;
  }
  const player = db
    .prepare("SELECT * FROM players WHERE id = ?")
    .get(session.player_id) as PlayerRow | undefined;
  if (!player) return null;
  const team = db
    .prepare("SELECT * FROM teams WHERE id = ?")
    .get(player.team_id) as TeamRow | undefined;
  if (!team) return null;
  return { ...player, team };
}

export async function getCurrentSessionId(): Promise<string | null> {
  const raw = await readSessionCookie();
  if (!raw) return null;
  return unpack(raw);
}

export function verifyPasscode(input: string): boolean {
  const expected = process.env.TRIP_PASSCODE ?? "";
  if (!expected) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
