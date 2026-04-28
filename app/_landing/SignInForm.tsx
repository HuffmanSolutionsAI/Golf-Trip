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
        <div className="eyebrow-cream mb-1.5" style={{ opacity: 0.85 }}>
          Your name
        </div>
        <select
          value={playerId}
          onChange={(e) => setPlayerId(e.target.value)}
          required
          className="w-full bg-[var(--color-cream)] text-[var(--color-ink)] font-body-serif italic px-3.5 py-3 focus:outline-none focus:ring-1 focus:ring-[var(--color-gold)]"
          style={{ fontSize: 15, borderRadius: 2 }}
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
        <div className="eyebrow-cream mb-1.5" style={{ opacity: 0.85 }}>
          Trip passcode
        </div>
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="······"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          className="w-full bg-[var(--color-cream)] text-[var(--color-ink)] font-body-serif italic px-3.5 py-3 placeholder:text-[var(--color-stone)] focus:outline-none focus:ring-1 focus:ring-[var(--color-gold)]"
          style={{ fontSize: 15, borderRadius: 2 }}
        />
      </div>
      <button
        type="submit"
        disabled={status === "signing"}
        className="w-full bg-[var(--color-gold)] text-[var(--color-navy)] font-ui uppercase hover:bg-[var(--color-gold-light)] disabled:opacity-60"
        style={{
          fontSize: 11,
          letterSpacing: "0.32em",
          fontWeight: 600,
          padding: "14px 0",
          borderRadius: 2,
        }}
      >
        {status === "signing" ? "Signing in…" : "Enter the Invitational"}
      </button>
      {error && (
        <div className="text-xs text-[var(--color-gold-light)] text-center">{error}</div>
      )}
    </form>
  );
}
