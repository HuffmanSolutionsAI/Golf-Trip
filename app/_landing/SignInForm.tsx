"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LandingSignInForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("sending");
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          (process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin) +
          "/auth/callback",
      },
    });
    if (error) {
      setError(error.message);
      setStatus("error");
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="space-y-2">
        <div className="text-sm font-ui text-[var(--color-gold)] uppercase tracking-[0.2em]">
          Check your email
        </div>
        <p className="font-body-serif italic text-[var(--color-cream)]/70 text-lg">
          We sent a sign-in link to <span className="not-italic">{email}</span>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 text-left">
      <Input
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="bg-[var(--color-cream)] text-[var(--color-ink)]"
      />
      <Button
        type="submit"
        size="lg"
        variant="primary"
        className="w-full"
        disabled={status === "sending"}
      >
        {status === "sending" ? "Sending…" : "Sign in with magic link"}
      </Button>
      {error && (
        <div className="text-xs text-[var(--color-gold-light)]">{error}</div>
      )}
    </form>
  );
}
