import { NextResponse } from "next/server";
import {
  clearSessionCookie,
  closeSession,
  getCurrentSessionId,
} from "@/lib/session";

export async function POST() {
  const sid = await getCurrentSessionId();
  if (sid) closeSession(sid);
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
