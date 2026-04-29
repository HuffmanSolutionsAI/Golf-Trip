import Link from "next/link";

export const dynamic = "force-dynamic";

const REASON_COPY: Record<string, { title: string; body: string }> = {
  missing: {
    title: "No token found.",
    body:
      "The sign-in link looks incomplete. Try requesting a fresh one from the sign-in page.",
  },
  invalid: {
    title: "That link won't work.",
    body:
      "Sign-in links expire after 15 minutes and can only be used once. Request a new one and try again.",
  },
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const copy = REASON_COPY[reason ?? "invalid"] ?? REASON_COPY.invalid;
  return (
    <div className="min-h-[100dvh] paper-grain flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-[480px] text-center">
        <div
          className="font-ui uppercase"
          style={{
            fontSize: 11,
            letterSpacing: "0.32em",
            color: "var(--color-oxblood)",
            fontWeight: 500,
          }}
        >
          Sign-in error
        </div>
        <h1
          className="font-display text-[var(--color-navy)] mt-2 mb-3"
          style={{ fontSize: 36, lineHeight: 1.05, letterSpacing: "-0.01em" }}
        >
          {copy.title}
        </h1>
        <p
          className="font-body-serif italic mb-7"
          style={{
            fontSize: 15,
            color: "var(--color-stone)",
            opacity: 0.75,
            lineHeight: 1.6,
          }}
        >
          {copy.body}
        </p>
        <Link
          href="/auth/sign-in"
          className="font-ui uppercase px-5 py-2.5 inline-block"
          style={{
            fontSize: 10,
            letterSpacing: "0.28em",
            color: "var(--color-cream)",
            background: "var(--color-navy)",
            fontWeight: 600,
          }}
        >
          Request a new link
        </Link>
      </div>
    </div>
  );
}
