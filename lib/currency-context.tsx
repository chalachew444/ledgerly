"use client";

import { createContext, startTransition, useCallback, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { CurrencyCode } from "@/lib/finance-types";

export type Currency = CurrencyCode;
type ExchangeRates = { base: "USD"; asOf: string; rates: Record<Currency, number> };

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  rates: ExchangeRates | null;
  ratesUpdatedAt: string | null;
  convertAmount: (amount: number, from: Currency, to?: Currency) => number | null;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);
const currencyStorageKey = "ledgerly-currency-v1";
const exchangeRatesStorageKey = "ledgerly-exchange-rates-v1";
const databaseEnabled = process.env.NEXT_PUBLIC_DATABASE_ENABLED === "true";

function parseCurrency(value: unknown): Currency | null {
  return value === "ETB" || value === "USD" || value === "EUR" ? value : null;
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [currency, setCurrencyState] = useState<Currency>("ETB");
  const [rates, setRates] = useState<ExchangeRates | null>(null);

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
    async function loadRates() {
      try {
        const response = await fetch("/api/exchange-rates", { cache: "no-store" });
        if (!response.ok) throw new Error("Exchange rates unavailable");
        const nextRates = await response.json() as ExchangeRates;
        if (active) {
          setRates(nextRates);
          window.localStorage.setItem(exchangeRatesStorageKey, JSON.stringify(nextRates));
        }
      } catch {
        const storedRates = window.localStorage.getItem(exchangeRatesStorageKey);
        if (!storedRates) return;
        try {
          const parsed = JSON.parse(storedRates) as ExchangeRates;
          if (active && parsed.base === "USD" && parsed.rates.USD === 1 && parsed.rates.ETB > 0 && parsed.rates.EUR > 0) setRates(parsed);
        } catch {
          window.localStorage.removeItem(exchangeRatesStorageKey);
        }
      }
    }
    void loadCurrency();
    void loadRates();
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

  const convertAmount = useCallback((amount: number, from: Currency, to = currency) => {
    if (from === to) return amount;
    if (!rates) return null;
    return amount / rates.rates[from] * rates.rates[to];
  }, [currency, rates]);

  return <CurrencyContext.Provider value={{ currency, setCurrency, rates, ratesUpdatedAt: rates?.asOf ?? null, convertAmount }}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error("useCurrency must be used inside CurrencyProvider.");
  return context;
}