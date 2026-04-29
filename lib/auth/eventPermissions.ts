import "server-only";
import { getCurrentUser } from "@/lib/session";
import { getEventById } from "@/lib/repo/events";
import { isCommissioner } from "@/lib/auth/roles";
import type { EventRow, UserRow } from "@/lib/types";

export type CommissionerGuard =
  | { ok: true; user: UserRow; event: EventRow }
  | { ok: false; status: 401 | 403 | 404; error: string };

// Resolve the active user and verify they can administer the given event.
// Returns a discriminated union so route handlers can short-circuit with
// the right HTTP status. Treats events.commissioner_user_id as an
// implicit commissioner grant (covers the bootstrap before any
// event_roles row exists for the creator).
export async function checkCommissioner(
  slug: string,
): Promise<CommissionerGuard> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, status: 401, error: "Sign in required." };
  const event = getEventById(slug);
  if (!event) return { ok: false, status: 404, error: "Event not found." };
  const isOwner = event.commissioner_user_id === user.id;
  if (!isOwner && !isCommissioner(user.id, event.id)) {
    return { ok: false, status: 403, error: "Commissioner access required." };
  }
  return { ok: true, user, event };
}
