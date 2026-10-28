"use client";

import { createContext, startTransition, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export type Currency = "ETB" | "USD";

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);
const currencyStorageKey = "ledgerly-currency-v1";
const databaseEnabled = process.env.NEXT_PUBLIC_DATABASE_ENABLED === "true";

function parseCurrency(value: unknown): Currency | null {
  return value === "ETB" || value === "USD" ? value : null;
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [currency, setCurrencyState] = useState<Currency>("ETB");

  useEffect(() => {
    let active = true;
    async function loadCurrency() {
      const localCurrency = parseCurrency(window.localStorage.getItem(currencyStorageKey));
      if (localCurrency && active) startTransition(() => setCurrencyState(localCurrency));
      if (!databaseEnabled || status !== "authenticated") return;
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        if (!response.ok) return;
        const profile = await response.json() as { currency?: unknown };
        const savedCurrency = parseCurrency(profile.currency);
        if (savedCurrency && active) {
          window.localStorage.setItem(currencyStorageKey, savedCurrency);
          startTransition(() => setCurrencyState(savedCurrency));
        }
      } catch {
        // The local currency preference remains available when the API is offline.
      }
    }
    void loadCurrency();
    return () => { active = false; };
  }, [status]);

  function setCurrency(nextCurrency: Currency) {
    setCurrencyState(nextCurrency);
    window.localStorage.setItem(currencyStorageKey, nextCurrency);
    if (databaseEnabled && status === "authenticated") {
      void fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: nextCurrency }),
      });
    }
  }

  return <CurrencyContext.Provider value={{ currency, setCurrency }}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error("useCurrency must be used inside CurrencyProvider.");
  return context;
}