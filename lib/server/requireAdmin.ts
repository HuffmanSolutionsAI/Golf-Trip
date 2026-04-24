import "server-only";
import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/session";

export async function requireAdmin(): Promise<
  | { ok: true; playerId: string }
  | { ok: false; response: NextResponse }
> {
  const me = await getCurrentPlayer();
  if (!me) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not signed in." }, { status: 401 }),
    };
  }
  if (!me.is_admin) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Admin only." }, { status: 403 }),
    };
  }
  return { ok: true, playerId: me.id };
}

export async function requireSession(): Promise<
  | { ok: true; playerId: string; isAdmin: boolean }
  | { ok: false; response: NextResponse }
> {
  const me = await getCurrentPlayer();
  if (!me) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not signed in." }, { status: 401 }),
    };
  }
  return { ok: true, playerId: me.id, isAdmin: !!me.is_admin };
}
