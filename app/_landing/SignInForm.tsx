"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PlayerOption = {
  id: string;
  name: string;
  team: string;
  handicap: number;
};

export function LandingSignInForm({ players }: { players: PlayerOption[] }) {
  const router = useRouter();
  const [playerId, setPlayerId] = useState("");
  const [passcode, setPasscode] = useState("");
  const [status, setStatus] = useState<"idle" | "signing" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!playerId) return setError("Pick your name first.");
    setStatus("signing");
    setError(null);
    const res = await fetch("/api/session/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, passcode }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus("error");
      setError(body.error ?? "Sign-in failed.");
      return;
    }
    router.push("/home");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 text-left">
      <div>
        <div className="eyebrow-cream mb-1.5">The Field</div>
        <select
          value={playerId}
          onChange={(e) => setPlayerId(e.target.value)}
          required
          className="w-full bg-[var(--color-cream)] text-[var(--color-ink)] font-body-serif italic text-base px-3.5 py-3 focus:outline-none focus:ring-1 focus:ring-[var(--color-gold)]"
        >
          <option value="">Select your name…</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.team} · HCP {p.handicap}
            </option>
          ))}
        </select>
      </div>
      <div>
        <div className="eyebrow-cream mb-1.5">Trip Passcode</div>
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="······"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          className="w-full bg-[var(--color-cream)] text-[var(--color-ink)] font-body-serif italic text-base px-3.5 py-3 placeholder:text-[var(--color-stone)] focus:outline-none focus:ring-1 focus:ring-[var(--color-gold)]"
        />
      </div>
      <button
        type="submit"
        disabled={status === "signing"}
        className="w-full bg-[var(--color-gold)] text-[var(--color-navy)] font-ui font-semibold uppercase text-[11px] tracking-[0.3em] py-3.5 hover:bg-[var(--color-gold-light)] disabled:opacity-60"
      >
        {status === "signing" ? "Signing in…" : "Sign in"}
      </button>
      {error && (
        <div className="text-xs text-[var(--color-gold-light)] text-center">{error}</div>
      )}
    </form>
  );
}
