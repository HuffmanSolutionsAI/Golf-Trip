"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, User } from "lucide-react";
import { Seal } from "@/components/brand/Seal";

export function TopNav({
  playerName,
  teamName,
  isAdmin,
}: {
  playerName?: string | null;
  teamName?: string | null;
  isAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function signOut() {
    await fetch("/api/session/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="navy-grain text-[var(--color-cream)] border-b border-[var(--color-gold)]/40">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
        <Link href="/home" className="flex items-center gap-3 shrink-0">
          <Seal size={36} />
          <div className="hidden sm:block leading-tight">
            <div
              className="font-display italic text-[var(--color-cream)]"
              style={{ fontSize: 18, lineHeight: 1 }}
            >
              Neal &amp; Pam
            </div>
            <div className="eyebrow-cream mt-1" style={{ fontSize: 8, opacity: 0.65 }}>
              INVITATIONAL · YEAR V
            </div>
          </div>
        </Link>
        {playerName && (
          <div className="relative">
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-navy-deep)] hover:bg-black/40 text-xs font-ui font-medium tracking-wide"
            >
              <User size={14} />
              <span className="max-w-[8rem] truncate">{playerName}</span>
              <ChevronDown size={14} />
            </button>
            {open && (
              <div className="absolute right-0 mt-2 w-56 bg-[var(--color-cream)] text-[var(--color-ink)] shadow-lg border border-[var(--color-rule)] z-50">
                <div className="px-4 py-3 border-b border-[var(--color-rule)]">
                  <div className="text-sm font-semibold">{playerName}</div>
                  {teamName && (
                    <div className="text-xs text-neutral-600">{teamName}</div>
                  )}
                  {isAdmin && (
                    <div className="mt-1 text-[10px] uppercase tracking-[0.3em] text-[var(--color-gold)] font-semibold">
                      Commissioner
                    </div>
                  )}
                </div>
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--color-paper)] text-left"
                >
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
