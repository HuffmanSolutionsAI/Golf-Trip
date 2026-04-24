"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, CalendarDays, Users, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/chat", label: "Chat", icon: MessageSquare },
];

export function BottomTabBar() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-[var(--color-navy)] text-[var(--color-cream)] border-t border-[var(--color-gold)]/30 z-40">
      <ul className="flex justify-around">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[10px] uppercase tracking-wider font-ui font-medium",
                  active ? "text-[var(--color-gold)]" : "text-[var(--color-cream)]/70",
                )}
              >
                <Icon size={18} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
