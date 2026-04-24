import * as React from "react";
import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "w-full rounded-md border border-[var(--color-rule)] bg-white px-3 py-2.5 text-sm font-ui text-[var(--color-ink)] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
