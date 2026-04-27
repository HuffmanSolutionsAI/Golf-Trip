import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import {
  openSession,
  setSessionCookie,
  verifyPasscode,
} from "@/lib/session";
import type { PlayerRow } from "@/lib/types";

const Body = z.object({
  playerId: z.string().min(1),
  passcode: z.string().min(1),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  if (!verifyPasscode(parsed.data.passcode)) {
    return NextResponse.json({ error: "Incorrect passcode." }, { status: 403 });
  }

  const db = getDb();
  const player = db
    .prepare("SELECT * FROM players WHERE id = ?")
    .get(parsed.data.playerId) as PlayerRow | undefined;
  if (!player) return NextResponse.json({ error: "Unknown player." }, { status: 404 });

  const { cookieValue, expiresAt } = openSession(player.id);
  await setSessionCookie(cookieValue, expiresAt);
  return NextResponse.json({ ok: true, player: { id: player.id, name: player.name } });
}
