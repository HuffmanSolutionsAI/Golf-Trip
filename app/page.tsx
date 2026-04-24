import Link from "next/link";
import { Badge } from "@/components/brand/Badge";
import { Wordmark } from "@/components/brand/Wordmark";
import { LandingSignInForm } from "./_landing/SignInForm";

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] bg-[var(--color-navy)] text-[var(--color-cream)] flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md text-center space-y-10">
          <div className="flex justify-center">
            <Badge size={140} variant="light" />
          </div>
          <div className="flex justify-center">
            <div className="w-72">
              <Wordmark variant="light" />
            </div>
          </div>
          <p className="font-body-serif text-xl italic text-[var(--color-cream)]/80">
            Live scoring · Pinehurst · May 7&ndash;9
          </p>
          <LandingSignInForm />
          <div className="pt-4">
            <Link
              href="/leaderboard"
              className="text-xs font-ui uppercase tracking-[0.3em] text-[var(--color-gold-light)] hover:text-[var(--color-gold)]"
            >
              View leaderboard as spectator →
            </Link>
          </div>
        </div>
      </div>
      <div className="pb-6 text-center text-[10px] font-ui tracking-[0.4em] uppercase text-[var(--color-cream)]/40">
        Year V · MMXXVI
      </div>
    </div>
  );
}
