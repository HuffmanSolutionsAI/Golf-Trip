"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { label: "Home", href: "/home", matches: (p: string) => p === "/home" },
  { label: "Live", href: "/leaderboard", matches: (p: string) => p === "/leaderboard" || p.startsWith("/leaderboard/") },
  { label: "Day I", href: "/day1", matches: (p: string) => p === "/day1" || p.startsWith("/day1/") },
  { label: "Day II", href: "/day2", matches: (p: string) => p === "/day2" || p.startsWith("/day2/") },
  { label: "Day III", href: "/day3", matches: (p: string) => p === "/day3" || p.startsWith("/day3/") },
];

export function BottomNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 navy-grain"
      style={{ borderTop: "1px solid rgba(165,136,89,0.35)" }}
    >
      <div className="flex">
        {ITEMS.map((item) => {
          const active = item.matches(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center py-3 font-ui uppercase"
              style={{
                fontSize: 9,
                letterSpacing: "0.2em",
                color: active ? "var(--color-gold)" : "var(--color-cream)",
                opacity: active ? 1 : 0.65,
                borderTop: active ? "2px solid var(--color-gold)" : "2px solid transparent",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
