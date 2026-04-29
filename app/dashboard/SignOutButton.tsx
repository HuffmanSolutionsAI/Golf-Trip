"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/session/logout", { method: "POST" });
    } finally {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="font-ui uppercase px-3 py-2"
      style={{
        fontSize: 10,
        letterSpacing: "0.24em",
        color: "var(--color-stone)",
        border: "1px solid var(--color-rule-cream)",
        background: "transparent",
        opacity: busy ? 0.5 : 1,
      }}
    >
      Sign out
    </button>
  );
}
