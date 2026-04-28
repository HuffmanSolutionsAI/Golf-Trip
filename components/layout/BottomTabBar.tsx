"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, CalendarDays, Users, MessageSquare } from "lucide-react";

const TABS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/leaderboard", label: "Board", icon: Trophy },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/teams", label: "Field", icon: Users },
  { href: "/chat", label: "Chat", icon: MessageSquare },
];

export function BottomTabBar() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-[var(--color-cream)] border-t border-[var(--color-gold)]/70 z-40">
      <ul className="flex">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className="flex flex-col items-center gap-1 py-2.5"
              >
                <Icon
                  size={16}
                  className={active ? "text-[var(--color-navy)]" : "text-[var(--color-stone)]"}
                />
                <span
                  className="font-ui font-medium uppercase"
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.2em",
                    color: active ? "var(--color-navy)" : "var(--color-stone)",
                  }}
                >
                  {label}
                </span>
                {active && (
                  <span
                    className="block"
                    style={{
                      height: 2,
                      width: 18,
                      background: "var(--color-gold)",
                      marginTop: 2,
                    }}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
