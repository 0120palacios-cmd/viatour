"use client";

import { ToggleGroup } from "radix-ui";
import { useCurrency } from "@/components/currency-provider";

export function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();
  return (
    <ToggleGroup.Root type="single" value={currency} aria-label="Moneda" className="inline-flex rounded-btn border border-line bg-canvas p-1 text-ink" onValueChange={(value) => {
      if (value === "USD" || value === "HNL") setCurrency(value);
    }}>
      {(["USD", "HNL"] as const).map((value) => (
        <ToggleGroup.Item key={value} value={value} aria-label={value} className="t-small min-h-12 rounded-btn px-3 transition-colors duration-(--duration-fast) ease-out hover:bg-surface data-[state=on]:bg-brand-tint data-[state=on]:text-brand">
          {value}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
