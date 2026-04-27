"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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
    <form onSubmit={onSubmit} className="space-y-3 text-left">
      <div>
        <Label className="text-[var(--color-cream)]">Who are you?</Label>
        <Select
          className="bg-[var(--color-cream)] text-[var(--color-ink)]"
          value={playerId}
          onChange={(e) => setPlayerId(e.target.value)}
          required
        >
          <option value="">Select your name…</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.team} · HCP {p.handicap}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label className="text-[var(--color-cream)]">Trip passcode</Label>
        <Input
          type="password"
          required
          autoComplete="current-password"
          placeholder="Ask Reid if you forgot"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          className="bg-[var(--color-cream)] text-[var(--color-ink)]"
        />
      </div>
      <Button
        type="submit"
        size="lg"
        variant="primary"
        className="w-full"
        disabled={status === "signing"}
      >
        {status === "signing" ? "Signing in…" : "Sign in"}
      </Button>
      {error && (
        <div className="text-xs text-[var(--color-gold-light)] text-center">{error}</div>
      )}
    </form>
  );
}
