import * as React from "react";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "block text-[0.6875rem] font-ui font-semibold uppercase tracking-[0.25em] text-[var(--color-navy)] mb-1.5",
      className,
    )}
    {...props}
  />
));
Label.displayName = "Label";
