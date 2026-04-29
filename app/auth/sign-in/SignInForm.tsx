"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SignInForm({
  next,
  eventId,
}: {
  next: string | null;
  eventId: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          eventId: eventId ?? undefined,
          next: next ?? undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Could not send sign-in link.");
        setSubmitting(false);
        return;
      }
      router.push(`/auth/check-email?email=${encodeURIComponent(email)}`);
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input
        type="email"
        required
        autoComplete="email"
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="font-body-serif px-4 py-3"
        style={{
          fontSize: 16,
          background: "var(--color-cream)",
          border: "1px solid var(--color-rule-cream)",
          color: "var(--color-navy)",
        }}
      />
      <button
        type="submit"
        disabled={submitting}
        className="font-ui uppercase px-5 py-3"
        style={{
          fontSize: 11,
          letterSpacing: "0.28em",
          color: "var(--color-cream)",
          background: "var(--color-navy)",
          fontWeight: 600,
          opacity: submitting ? 0.6 : 1,
        }}
      >
        {submitting ? "Sending…" : "Send link"}
      </button>
      {error && (
        <div
          className="font-body-serif italic"
          style={{ fontSize: 13, color: "var(--color-oxblood)" }}
        >
          {error}
        </div>
      )}
    </form>
  );
}
