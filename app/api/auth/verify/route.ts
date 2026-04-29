import { NextResponse } from "next/server";
import { findValidToken, markTokenUsed } from "@/lib/server/magicLink";
import {
  findOrCreateUserByEmail,
  openUserSession,
  setSessionCookie,
} from "@/lib/session";

export const runtime = "nodejs";

function safeNext(next: string | null | undefined): string {
  // Only allow same-origin paths starting with '/'. Anything else falls back
  // to the home page.
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/home";
  return next;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/auth/error?reason=missing", url.origin));
  }

  const row = findValidToken(token);
  if (!row) {
    return NextResponse.redirect(new URL("/auth/error?reason=invalid", url.origin));
  }

  // Materialize the user, mark token used, and open the session.
  const user = findOrCreateUserByEmail(row.email);
  markTokenUsed(row.token_hash);
  const { cookieValue, expiresAt } = openUserSession(user.id);
  await setSessionCookie(cookieValue, expiresAt);

  const next = safeNext(row.next_path);
  return NextResponse.redirect(new URL(next, url.origin));
}
