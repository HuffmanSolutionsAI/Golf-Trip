import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { reseedDay1StrokesIfUnlocked } from "@/lib/server/reseedDay1";

export async function POST() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const admin = createAdminSupabase();
  await reseedDay1StrokesIfUnlocked(admin);
  return NextResponse.json({ ok: true });
}
