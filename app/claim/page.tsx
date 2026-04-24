import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Badge } from "@/components/brand/Badge";
import { ClaimForm } from "./ClaimForm";

export const dynamic = "force-dynamic";

export default async function ClaimPage() {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/");

  // If the user already has a player row, bounce to /home.
  const { data: existing } = await supabase
    .from("players")
    .select("id")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (existing) redirect("/home");

  const { data: unclaimed } = await supabase
    .from("players")
    .select("id, name, handicap, team:teams(name, display_color)")
    .is("user_id", null)
    .order("name");

  return (
    <div className="min-h-[100dvh] bg-[var(--color-paper)] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-[var(--color-cream)] rounded-lg shadow border border-[var(--color-rule)] p-6 space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Badge size={72} />
          <h1 className="font-display text-2xl text-[var(--color-navy)]">
            One last step
          </h1>
          <p className="font-body-serif italic text-[var(--color-ink)]/70">
            Claim your slot to start scoring.
          </p>
        </div>
        <ClaimForm unclaimed={(unclaimed ?? []) as never} />
        <p className="text-xs text-neutral-600 text-center font-ui">
          If you&rsquo;re not in the list, it means someone else already claimed that
          name. Ping Reid.
        </p>
      </div>
    </div>
  );
}
