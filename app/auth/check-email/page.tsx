export const dynamic = "force-dynamic";

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return (
    <div className="min-h-[100dvh] paper-grain flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-[480px] text-center">
        <div
          className="font-ui uppercase"
          style={{
            fontSize: 11,
            letterSpacing: "0.32em",
            color: "var(--color-gold)",
            fontWeight: 500,
          }}
        >
          Check your email
        </div>
        <h1
          className="font-display text-[var(--color-navy)] mt-2 mb-3"
          style={{ fontSize: 36, lineHeight: 1.05, letterSpacing: "-0.01em" }}
        >
          The link is on its way.
        </h1>
        <p
          className="font-body-serif italic"
          style={{
            fontSize: 15,
            color: "var(--color-stone)",
            opacity: 0.75,
            lineHeight: 1.6,
          }}
        >
          {email ? (
            <>
              We sent a sign-in link to{" "}
              <span style={{ color: "var(--color-navy)" }}>{email}</span>.
            </>
          ) : (
            "We sent a sign-in link to your inbox."
          )}{" "}
          It&apos;s good for 15 minutes — click it and you&apos;ll be back here
          signed in.
        </p>
      </div>
    </div>
  );
}
