import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { reseedDay1StrokesIfUnlocked } from "@/lib/server/reseedDay1";
import { emitChange } from "@/lib/events";
import { recordAudit } from "@/lib/repo/audit";

export async function POST() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  reseedDay1StrokesIfUnlocked();
  recordAudit({ playerId: gate.playerId, action: "day1.reseed" });
  emitChange("matches");
  return NextResponse.json({ ok: true });
}
