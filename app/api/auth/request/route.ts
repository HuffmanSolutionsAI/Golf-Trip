import { NextResponse } from "next/server";
import { z } from "zod";
import { createMagicLinkToken } from "@/lib/server/magicLink";
import { sendEmail } from "@/lib/server/email";
import { getEventById } from "@/lib/repo/events";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email(),
  eventId: z.string().min(1).optional(),
  next: z.string().min(1).optional(),
});

function appOrigin(request: Request): string {
  // Honor x-forwarded-* if present (Cloudflare Tunnel does this); otherwise
  // fall back to the URL the request arrived at.
  const url = new URL(request.url);
  const proto =
    request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? url.host;
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // If an event id is provided, validate it. Unknown event ids are rejected
  // rather than silently bound to nothing.
  if (parsed.data.eventId && !getEventById(parsed.data.eventId)) {
    return NextResponse.json({ error: "Unknown event." }, { status: 404 });
  }

  const { token, expiresAt } = createMagicLinkToken({
    email: parsed.data.email,
    eventId: parsed.data.eventId ?? null,
    nextPath: parsed.data.next ?? null,
  });

  const link = `${appOrigin(req)}/api/auth/verify?token=${encodeURIComponent(token)}`;
  const result = await sendEmail({
    to: parsed.data.email,
    subject: "Your sign-in link",
    text: `Sign in:\n\n${link}\n\nThis link is good for 15 minutes.\nIf you didn't ask for it, ignore this email.`,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  // Don't leak whether the email is "known"; both new and existing addresses
  // get the same response. Also don't include the link itself — even in dev,
  // it's logged to stderr by the console transport.
  return NextResponse.json({
    ok: true,
    expiresAt: expiresAt.toISOString(),
    via: result.via,
  });
}
