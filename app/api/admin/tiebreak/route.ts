import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/server/requireAdmin";

const Body = z.object({
  scrambleEntryId: z.string().uuid(),
  manualRank: z.number().int().min(1).max(5).nullable(),
});

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const admin = createAdminSupabase();
  const { error } = await admin
    .from("scramble_entries")
    .update({ manual_tiebreak_rank: parsed.data.manualRank })
    .eq("id", parsed.data.scrambleEntryId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
