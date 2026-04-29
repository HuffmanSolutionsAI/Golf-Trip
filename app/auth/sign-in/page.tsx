import { SignInForm } from "./SignInForm";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; event?: string }>;
}) {
  const { next, event } = await searchParams;
  return (
    <div className="min-h-[100dvh] paper-grain flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-[420px]">
        <div
          className="font-ui uppercase"
          style={{
            fontSize: 11,
            letterSpacing: "0.32em",
            color: "var(--color-gold)",
            fontWeight: 500,
          }}
        >
          Sign in
        </div>
        <h1
          className="font-display text-[var(--color-navy)] mt-2 mb-2"
          style={{ fontSize: 38, lineHeight: 1, letterSpacing: "-0.01em" }}
        >
          One-time link.
        </h1>
        <p
          className="font-body-serif italic mb-7"
          style={{
            fontSize: 15,
            color: "var(--color-stone)",
            opacity: 0.75,
            lineHeight: 1.55,
          }}
        >
          Enter your email and we&apos;ll send a sign-in link. The link is good
          for 15 minutes.
        </p>
        <SignInForm next={next ?? null} eventId={event ?? null} />
      </div>
    </div>
  );
}
