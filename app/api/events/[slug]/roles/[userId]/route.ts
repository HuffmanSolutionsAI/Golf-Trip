import { NextResponse } from "next/server";
import { checkCommissioner } from "@/lib/auth/eventPermissions";
import { revokeRole } from "@/lib/auth/roles";

export const runtime = "nodejs";

// Revoke a user's role on this event. Refuses to revoke the bootstrap
// commissioner (events.commissioner_user_id) so an event can never end up
// unowned — the commissioner has to hand off ownership first (deferred to
// a later phase). (Plan A · Phase 3g)

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string; userId: string }> },
) {
  const { slug, userId } = await params;
  const guard = await checkCommissioner(slug);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  if (guard.event.commissioner_user_id === userId) {
    return NextResponse.json(
      { error: "Can't revoke the event creator's commissioner role." },
      { status: 409 },
    );
  }

  revokeRole(userId, slug);
  return NextResponse.json({ ok: true });
}
