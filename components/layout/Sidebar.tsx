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
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/chat", label: "Chat", icon: MessageSquare },
];

export function Sidebar({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:block w-56 shrink-0 border-r border-[var(--color-rule)] bg-[var(--color-paper)]">
      <nav className="p-4">
        <ul className="space-y-0.5">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-ui",
                    active
                      ? "bg-[var(--color-navy)] text-[var(--color-cream)]"
                      : "text-[var(--color-navy)] hover:bg-[var(--color-cream)]",
                  )}
                >
                  <Icon size={16} /> {label}
                </Link>
              </li>
            );
          })}
          {isAdmin && (
            <li>
              <Link
                href="/admin"
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-ui",
                  pathname.startsWith("/admin")
                    ? "bg-[var(--color-navy)] text-[var(--color-cream)]"
                    : "text-[var(--color-navy)] hover:bg-[var(--color-cream)]",
                )}
              >
                <Shield size={16} /> Admin
              </Link>
            </li>
          )}
        </ul>
      </nav>
    </aside>
  );
}
