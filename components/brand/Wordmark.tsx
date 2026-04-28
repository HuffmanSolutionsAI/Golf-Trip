// Backwards-compatible facade for the brand lockup. Old call sites use
// variant="dark" | "light"; new ones use the Lockup directly with "cream" | "navy".
import { Lockup, LockupInline } from "./Lockup";

type LegacyVariant = "dark" | "light";

function mapVariant(v?: LegacyVariant): "cream" | "navy" {
  // "dark" historically meant the mark renders in dark ink (navy) on a light field.
  // "light" historically meant the mark renders in light ink (cream) on a dark field.
  return v === "dark" ? "navy" : "cream";
}

export function Wordmark({
  variant = "light",
  className,
}: {
  variant?: LegacyVariant;
  className?: string;
}) {
  return <Lockup variant={mapVariant(variant)} className={className} width={288} />;
}

export function WordmarkInline({ variant = "light" }: { variant?: LegacyVariant }) {
  return <LockupInline variant={mapVariant(variant)} />;
}
