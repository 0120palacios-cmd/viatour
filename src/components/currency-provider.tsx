"use client";

import { createContext, useContext, useState } from "react";

export type Currency = "USD" | "HNL";
export const currencyCookie = "viatour-currency";

const CurrencyContext = createContext<{
  currency: Currency;
  setCurrency: (currency: Currency) => void;
} | null>(null);

export function CurrencyProvider({ children, initialCurrency = "USD" }: {
  children: React.ReactNode;
  initialCurrency?: Currency;
}) {
  const [currency, updateCurrency] = useState<Currency>(initialCurrency);

  function setCurrency(value: Currency) {
    updateCurrency(value);
    document.cookie = `${currencyCookie}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  }

  return <CurrencyContext.Provider value={{ currency, setCurrency }}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error("useCurrency requiere CurrencyProvider");
  return context;
}
