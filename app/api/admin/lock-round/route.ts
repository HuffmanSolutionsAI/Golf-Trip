import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { postIfRoundLocked } from "@/lib/server/systemPosts";
import type { RoundRow } from "@/lib/types";

const Body = z.object({
  roundId: z.string().uuid(),
  locked: z.boolean().optional(),
});

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const admin = createAdminSupabase();
  const locked = parsed.data.locked ?? true;
  const { data, error } = await admin
    .from("rounds")
    .update({ is_locked: locked })
    .eq("id", parsed.data.roundId)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await postIfRoundLocked(admin, data as RoundRow);

  return NextResponse.json({ ok: true });
}
