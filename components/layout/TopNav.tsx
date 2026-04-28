"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, LogOut, Menu, X } from "lucide-react";
import { Seal } from "@/components/brand/Seal";

const NAV: { label: string; href: string; matches: (path: string) => boolean }[] = [
  { label: "Live", href: "/leaderboard", matches: (p) => p === "/leaderboard" || p.startsWith("/leaderboard/") },
  { label: "Format", href: "/format", matches: (p) => p === "/format" || p.startsWith("/format/") },
  { label: "The Field", href: "/teams", matches: (p) => p === "/teams" || p.startsWith("/teams/") },
  { label: "Day I", href: "/day1", matches: (p) => p === "/day1" || p.startsWith("/day1/") },
  { label: "Day II", href: "/day2", matches: (p) => p === "/day2" || p.startsWith("/day2/") },
  { label: "Day III", href: "/day3", matches: (p) => p === "/day3" || p.startsWith("/day3/") },
];

export function TopNav({
  playerName,
  teamName,
  isAdmin,
  spectator = false,
}: {
  playerName?: string | null;
  teamName?: string | null;
  isAdmin?: boolean;
  spectator?: boolean;
}) {
  const pathname = usePathname() ?? "/";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const router = useRouter();

  async function signOut() {
    await fetch("/api/session/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const initial = (playerName?.[0] ?? "?").toUpperCase();

  return (
    <header
      className="bg-[var(--color-navy)] text-[var(--color-cream)]"
      style={{ borderBottom: "1px solid rgba(165,136,89,0.2)" }}
    >
      {/* DESKTOP */}
      <div className="hidden md:flex mx-auto max-w-[1280px] items-center justify-between px-8 py-4">
        <Link href="/home" className="flex items-center gap-3.5 shrink-0">
          <Seal size={36} />
          <div className="leading-tight">
            <div
              className="font-display"
              style={{ fontSize: 18, lineHeight: 1, color: "var(--color-cream)" }}
            >
              The Neal &amp; Pam Invitational
            </div>
            <div
              className="font-ui"
              style={{
                fontSize: 8,
                letterSpacing: "0.32em",
                color: "var(--color-gold)",
                marginTop: 3,
                textTransform: "uppercase",
                fontWeight: 500,
              }}
            >
              YEAR V · PINEHURST · MMXXVI
            </div>
          </div>
        </Link>
        <nav className="flex gap-6">
          {NAV.map((n) => {
            const active = n.matches(pathname);
            return (
              <Link
                key={n.href}
                href={n.href}
                className="font-ui font-medium uppercase"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.22em",
                  color: active ? "var(--color-gold)" : "var(--color-cream)",
                  opacity: active ? 1 : 0.85,
                  paddingBottom: 4,
                  borderBottom: active
                    ? "1px solid var(--color-gold)"
                    : "1px solid transparent",
                }}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3.5 shrink-0">
          {spectator ? (
            <Link
              href="/"
              className="font-ui uppercase"
              style={{
                fontSize: 10,
                letterSpacing: "0.22em",
                color: "var(--color-gold-light)",
              }}
            >
              Sign in →
            </Link>
          ) : (
            <>
              <span
                className="font-ui uppercase"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.22em",
                  color: "var(--color-cream)",
                  opacity: 0.7,
                }}
              >
                {playerName}
              </span>
              <div className="relative">
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex items-center justify-center"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    border: "1px solid var(--color-gold)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 12,
                    color: "var(--color-cream)",
                    background: "transparent",
                  }}
                  aria-label="Profile menu"
                >
                  {initial}
                </button>
                {profileOpen && (
                  <ProfileMenu
                    playerName={playerName}
                    teamName={teamName}
                    isAdmin={isAdmin}
                    onSignOut={signOut}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MOBILE */}
      <div className="md:hidden flex items-center justify-between px-4 py-3">
        <Link href="/home" className="flex items-center gap-2.5 shrink-0">
          <Seal size={28} />
          <div className="leading-tight">
            <div
              className="font-display"
              style={{ fontSize: 16, lineHeight: 1, color: "var(--color-cream)" }}
            >
              Neal &amp; Pam
            </div>
            <div
              className="font-ui"
              style={{
                fontSize: 7,
                letterSpacing: "0.3em",
                color: "var(--color-gold)",
                marginTop: 2,
                textTransform: "uppercase",
                fontWeight: 500,
              }}
            >
              YEAR V
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          {!spectator && (
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center justify-center"
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                border: "1px solid var(--color-gold)",
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--color-cream)",
                background: "transparent",
              }}
              aria-label="Profile"
            >
              {initial}
            </button>
          )}
          <button
            onClick={() => setDrawerOpen(true)}
            className="text-[var(--color-cream)]"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {drawerOpen && (
        <MobileDrawer
          pathname={pathname}
          onClose={() => setDrawerOpen(false)}
          spectator={spectator}
        />
      )}

      {profileOpen && (
        <div className="md:hidden">
          <ProfileMenu
            playerName={playerName}
            teamName={teamName}
            isAdmin={isAdmin}
            onSignOut={signOut}
          />
        </div>
      )}
    </header>
  );
}

function ProfileMenu({
  playerName,
  teamName,
  isAdmin,
  onSignOut,
}: {
  playerName?: string | null;
  teamName?: string | null;
  isAdmin?: boolean;
  onSignOut: () => void;
}) {
  return (
    <div
      className="absolute right-0 mt-2 w-56 z-50"
      style={{
        background: "var(--color-cream)",
        color: "var(--color-ink)",
        border: "1px solid var(--color-rule)",
      }}
    >
      <div
        className="px-4 py-3"
        style={{ borderBottom: "1px solid var(--color-rule)" }}
      >
        <div className="text-sm font-semibold">{playerName}</div>
        {teamName && <div className="text-xs text-[var(--color-stone)]">{teamName}</div>}
        {isAdmin && (
          <div className="eyebrow mt-1" style={{ fontSize: 8 }}>
            Commissioner
          </div>
        )}
      </div>
      <button
        onClick={onSignOut}
        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-[var(--color-paper)]"
      >
        <LogOut size={14} /> Sign out
      </button>
    </div>
  );
}

function MobileDrawer({
  pathname,
  onClose,
  spectator,
}: {
  pathname: string;
  onClose: () => void;
  spectator: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="navy-grain absolute right-0 top-0 bottom-0 w-72 max-w-[85vw] text-[var(--color-cream)] flex flex-col"
        style={{ borderLeft: "1px solid rgba(165,136,89,0.4)" }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(165,136,89,0.3)" }}
        >
          <span className="eyebrow-cream" style={{ opacity: 0.7 }}>
            MENU
          </span>
          <button onClick={onClose} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        <ul className="flex-1 px-2 py-4">
          {NAV.map((n) => {
            const active = n.matches(pathname);
            return (
              <li key={n.href}>
                <Link
                  href={n.href}
                  onClick={onClose}
                  className="block px-4 py-3 font-ui font-medium uppercase"
                  style={{
                    fontSize: 13,
                    letterSpacing: "0.22em",
                    color: active ? "var(--color-gold)" : "var(--color-cream)",
                    opacity: active ? 1 : 0.85,
                    borderLeft: active
                      ? "2px solid var(--color-gold)"
                      : "2px solid transparent",
                  }}
                >
                  {n.label}
                </Link>
              </li>
            );
          })}
          {/* Auxiliary */}
          {!spectator && (
            <>
              <li className="mt-4 px-4">
                <div
                  className="rule-gold"
                  style={{ opacity: 0.3, marginBottom: 12 }}
                />
              </li>
              <li>
                <Link
                  href="/home"
                  onClick={onClose}
                  className="block px-4 py-2 font-ui uppercase"
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.22em",
                    color: "var(--color-cream)",
                    opacity: 0.7,
                  }}
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/schedule"
                  onClick={onClose}
                  className="block px-4 py-2 font-ui uppercase"
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.22em",
                    color: "var(--color-cream)",
                    opacity: 0.7,
                  }}
                >
                  Schedule
                </Link>
              </li>
              <li>
                <Link
                  href="/chat"
                  onClick={onClose}
                  className="block px-4 py-2 font-ui uppercase"
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.22em",
                    color: "var(--color-cream)",
                    opacity: 0.7,
                  }}
                >
                  Chat
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
