import { hasPublishedPrice, type Package } from "@/lib/packages";

export function PackagePrice({ item }: { item: Package }) {
  // Prices are intentionally hidden in this phase, including configured ones.
  // hasPublishedPrice remains the single gate for the future public price path.
  if (!hasPublishedPrice(item)) {
    return <p className="t-small text-ink-soft">Solicitar cotización</p>;
  }

  return <p className="t-small text-ink-soft">Solicitar cotización</p>;
}
