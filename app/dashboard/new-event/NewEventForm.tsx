"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function NewEventForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [subtitle, setSubtitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-derive slug from name until the user touches the slug field.
  useEffect(() => {
    if (slugTouched) return;
    setSlug(slugify(name));
  }, [name, slugTouched]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/events/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name,
          subtitle: subtitle || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Could not create event.");
        setSubmitting(false);
        return;
      }
      router.push(`/events/${body.slug}`);
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  }

  const fieldStyle: React.CSSProperties = {
    fontSize: 16,
    background: "var(--color-cream)",
    border: "1px solid var(--color-rule-cream)",
    color: "var(--color-navy)",
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Event name">
        <input
          type="text"
          required
          minLength={2}
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="The Surfside Open"
          className="font-body-serif px-4 py-3 w-full"
          style={fieldStyle}
        />
      </Field>

      <Field label="Slug" hint="Used in the URL: /events/<slug>">
        <input
          type="text"
          required
          minLength={3}
          maxLength={64}
          pattern="[a-z0-9](?:[a-z0-9-]{1,62})[a-z0-9]"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugTouched(true);
          }}
          placeholder="surfside-open-2026"
          className="font-mono px-4 py-3 w-full"
          style={fieldStyle}
        />
      </Field>

      <Field label="Subtitle (optional)">
        <input
          type="text"
          maxLength={120}
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="Year I"
          className="font-body-serif px-4 py-3 w-full"
          style={fieldStyle}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date (optional)">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="font-mono px-4 py-3 w-full"
            style={fieldStyle}
          />
        </Field>
        <Field label="End date (optional)">
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="font-mono px-4 py-3 w-full"
            style={fieldStyle}
          />
        </Field>
      </div>

      <button
        type="submit"
        disabled={submitting || !name || !slug}
        className="font-ui uppercase px-5 py-3 mt-2"
        style={{
          fontSize: 11,
          letterSpacing: "0.28em",
          color: "var(--color-cream)",
          background: "var(--color-navy)",
          fontWeight: 600,
          opacity: submitting || !name || !slug ? 0.6 : 1,
        }}
      >
        {submitting ? "Creating…" : "Create event"}
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

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span
        className="font-ui uppercase"
        style={{
          fontSize: 10,
          letterSpacing: "0.24em",
          color: "var(--color-gold)",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      {children}
      {hint && (
        <span
          className="font-body-serif italic"
          style={{ fontSize: 12, color: "var(--color-stone)" }}
        >
          {hint}
        </span>
      )}
    </label>
  );
}
