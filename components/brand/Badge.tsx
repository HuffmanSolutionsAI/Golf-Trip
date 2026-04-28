// Backwards-compatible facade. New code should use <Seal /> from "./Seal".
import { Seal } from "./Seal";

type LegacyVariant = "dark" | "light";

export function Badge({
  size = 48,
  className,
}: {
  size?: number;
  variant?: LegacyVariant;
  className?: string;
}) {
  return <Seal size={size} className={className} />;
}
