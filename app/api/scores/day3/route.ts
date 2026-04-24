import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase/server";
import { postIfLeaderChanged, postTeeTimeAlertIfDue } from "@/lib/server/systemPosts";

const Body = z.object({
  scrambleEntryId: z.string().uuid(),
  holeNumber: z.number().int().min(1).max(18),
  strokes: z.number().int().min(1).max(15),
});

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { scrambleEntryId, holeNumber, strokes } = parsed.data;

  const { data: entry } = await supabase
    .from("scramble_entries")
    .select("round_id")
    .eq("id", scrambleEntryId)
    .maybeSingle();
  if (!entry) return NextResponse.json({ error: "Entry not found." }, { status: 404 });

  const { data: existing } = await supabase
    .from("hole_scores")
    .select("id")
    .eq("scramble_entry_id", scrambleEntryId)
    .eq("hole_number", holeNumber)
    .maybeSingle();

  let err: string | null = null;
  if (existing) {
    const { error } = await supabase
      .from("hole_scores")
      .update({ strokes, entered_by: auth.user.id, entered_at: new Date().toISOString() })
      .eq("id", existing.id);
    err = error?.message ?? null;
  } else {
    const { error } = await supabase.from("hole_scores").insert({
      round_id: entry.round_id,
      scramble_entry_id: scrambleEntryId,
      hole_number: holeNumber,
      strokes,
      entered_by: auth.user.id,
    });
    err = error?.message ?? null;
  }
  if (err) return NextResponse.json({ error: err }, { status: 403 });

  const admin = createAdminSupabase();
  await postIfLeaderChanged(admin);
  await postTeeTimeAlertIfDue(admin);

  return NextResponse.json({ ok: true });
}
