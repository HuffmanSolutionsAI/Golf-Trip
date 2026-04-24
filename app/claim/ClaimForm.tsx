"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type UnclaimedPlayer = {
  id: string;
  name: string;
  handicap: number;
  team: { name: string; display_color: string } | null;
};

export function ClaimForm({ unclaimed }: { unclaimed: UnclaimedPlayer[] }) {
  const router = useRouter();
  const [playerId, setPlayerId] = useState("");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!playerId) return setError("Pick your name first.");
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, passcode }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Something went wrong.");
      return;
    }
    router.push("/home");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="player">Which one are you?</Label>
        <Select
          id="player"
          value={playerId}
          onChange={(e) => setPlayerId(e.target.value)}
          required
        >
          <option value="">Select your name…</option>
          {unclaimed.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.team?.name ?? "—"} · HCP {p.handicap}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="passcode">Trip passcode</Label>
        <Input
          id="passcode"
          type="password"
          required
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="Ask Reid if you forgot"
        />
      </div>
      {error && <div className="text-xs text-[var(--color-oxblood)]">{error}</div>}
      <Button type="submit" size="lg" variant="primary" className="w-full" disabled={submitting}>
        {submitting ? "Claiming…" : "Claim my slot"}
      </Button>
    </form>
  );
}
