"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Trophy,
  CalendarDays,
  Users,
  MessageSquare,
  Shield,
} from "lucide-react";

const LINKS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/leaderboard", label: "The Field", icon: Trophy },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/chat", label: "Chat", icon: MessageSquare },
];

export function Sidebar({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const items = isAdmin
    ? [...LINKS, { href: "/admin", label: "Commissioner", icon: Shield }]
    : LINKS;
  return (
    <aside className="hidden md:block w-56 shrink-0 border-r border-[var(--color-rule)] bg-[var(--color-paper)]">
      <nav className="p-4">
        <ul>
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href} className="relative">
                {active && (
                  <span
                    className="absolute left-0 top-0 bottom-0"
                    style={{ width: 2, background: "var(--color-gold)" }}
                  />
                )}
                <Link
                  href={href}
                  className="flex items-center gap-3 px-4 py-2.5 text-[12px] font-ui font-medium uppercase tracking-[0.18em]"
                  style={{
                    color: active ? "var(--color-navy)" : "var(--color-stone)",
                  }}
                >
                  <Icon size={14} /> {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
