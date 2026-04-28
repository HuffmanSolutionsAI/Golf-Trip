import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTeeTime(t: string): string {
  // "10:21:00" → "10:21 AM"
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m} ${suffix}`;
}

export function formatRoundDate(d: string): string {
  // "2026-05-07" → "Thu 5/7"
  const date = new Date(d + "T12:00:00");
  const dow = date.toLocaleDateString("en-US", { weekday: "short" });
  return `${dow} ${date.getMonth() + 1}/${date.getDate()}`;
}

// Roman numerals, used everywhere in display copy ("Day II", "Match V").
const ROMAN: [number, string][] = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
  [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
  [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

export function toRoman(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return String(n);
  let out = "";
  let v = Math.floor(n);
  for (const [val, sym] of ROMAN) {
    while (v >= val) {
      out += sym;
      v -= val;
    }
  }
  return out;
}

export const TEAM_PALETTE: Record<string, { bg: string; ink: string }> = {
  "#A83232": { bg: "#A83232", ink: "#F3ECD8" },
  "#2F5233": { bg: "#2F5233", ink: "#F3ECD8" },
  "#2D4E8A": { bg: "#2D4E8A", ink: "#F3ECD8" },
  "#B07324": { bg: "#B07324", ink: "#F3ECD8" },
  "#5B2B4C": { bg: "#5B2B4C", ink: "#F3ECD8" },
};
