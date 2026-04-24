import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "outline";
  size?: "sm" | "md" | "lg";
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-ui font-semibold tracking-wide uppercase text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-gold)] focus:ring-offset-[var(--color-paper)]";

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-[var(--color-gold)] text-[var(--color-navy-deep)] hover:bg-[var(--color-gold-light)]",
  secondary:
    "bg-[var(--color-navy)] text-[var(--color-cream)] hover:bg-[var(--color-navy-deep)]",
  ghost:
    "bg-transparent text-[var(--color-navy)] hover:bg-[var(--color-cream)]",
  destructive:
    "bg-[var(--color-oxblood)] text-[var(--color-cream)] hover:opacity-90",
  outline:
    "bg-transparent border border-[var(--color-navy)] text-[var(--color-navy)] hover:bg-[var(--color-cream)]",
};

const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "px-3 py-1.5 text-[0.6875rem]",
  md: "px-4 py-2.5 text-xs",
  lg: "px-6 py-3 text-sm",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
