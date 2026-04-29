import "server-only";

// Email transport. Uses Resend if RESEND_API_KEY is set; otherwise logs the
// message to stderr so dev / self-hosted deployments work without an email
// account configured. The from-address is set via EMAIL_FROM (e.g.
// 'Clubhouse <hello@yourdomain.com>'); we fall back to onboarding@resend.dev
// which Resend allows for testing.

type SendArgs = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type EmailResult =
  | { ok: true; via: "resend" | "console" }
  | { ok: false; error: string };

export async function sendEmail(args: SendArgs): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

  if (!apiKey) {
    console.warn(
      `[email] RESEND_API_KEY not set; logging to console instead of sending.`,
    );
    console.warn(`[email] To: ${args.to}`);
    console.warn(`[email] Subject: ${args.subject}`);
    console.warn(`[email] Body:\n${args.text}`);
    return { ok: true, via: "console" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: args.to,
      subject: args.subject,
      text: args.text,
      html: args.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 200)}` };
  }
  return { ok: true, via: "resend" };
}
