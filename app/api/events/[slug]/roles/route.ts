import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { checkCommissioner } from "@/lib/auth/eventPermissions";
import { assignRole } from "@/lib/auth/roles";
import { findOrCreateUserByEmail } from "@/lib/session";
import { createMagicLinkToken } from "@/lib/server/magicLink";
import { sendEmail } from "@/lib/server/email";
import type { UserRow } from "@/lib/types";

export const runtime = "nodejs";

// Grant a role on this event to someone identified by email. Creates the
// users row if the email is unknown — the invitee picks up the grant the
// next time they sign in. We also fire a magic-link email so the recipient
// has a one-click sign-in path; if email isn't configured (no
// RESEND_API_KEY) this falls back to the console transport from
// lib/server/email.ts. (Plan A · Phase 3g)

const Body = z.object({
  email: z.string().email(),
  role: z.enum(["commissioner", "scorer", "player", "spectator"]),
});

function appOrigin(req: Request): string {
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") ?? url.host;
  return `${proto}://${host}`;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const guard = await checkCommissioner(slug);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const user: UserRow = findOrCreateUserByEmail(parsed.data.email);
  assignRole(user.id, slug, parsed.data.role);

  // Where the magic link should land them depends on the role they got.
  // Commissioners and scorers are working on the event; players land on
  // the public event page. Spectators don't really need a link but we
  // still send one for symmetry.
  const nextPath =
    parsed.data.role === "commissioner" || parsed.data.role === "scorer"
      ? `/events/${slug}/admin`
      : `/events/${slug}`;

  const { token } = createMagicLinkToken({
    email: parsed.data.email,
    eventId: slug,
    nextPath,
  });
  const link = `${appOrigin(req)}/api/auth/verify?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: parsed.data.email,
    subject: `You've been invited to ${guard.event.name}`,
    text: `${guard.user.display_name ?? guard.user.email} has invited you to ${guard.event.name} as ${parsed.data.role}.\n\nSign in:\n${link}\n\nThis link is good for 15 minutes. After it expires, you can request a new one any time at /auth/sign-in — your role grant is already in place.`,
  });

  // Don't surface email-transport errors as 5xx — the grant is already
  // saved; the invitee can sign in via /auth/sign-in even without the
  // email arriving.
  const db = getDb();
  const userOut = db
    .prepare("SELECT id, email, display_name FROM users WHERE id = ?")
    .get(user.id);
  return NextResponse.json({
    ok: true,
    user: userOut,
    role: parsed.data.role,
  });
}
