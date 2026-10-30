import { z } from "zod";
import type { CurrencyCode } from "@/lib/finance-types";

const exchangeRateSchema = z.object({
  result: z.literal("success"),
  base_code: z.literal("USD"),
  time_last_update_utc: z.string(),
  rates: z.record(z.string(), z.number().positive()),
});

export interface ExchangeRates {
  base: "USD";
  asOf: string;
  rates: Record<CurrencyCode, number>;
}

export async function fetchExchangeRates(): Promise<ExchangeRates> {
  const response = await fetch("https://open.er-api.com/v6/latest/USD", {
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Exchange-rate provider returned ${response.status}.`);
  const parsed = exchangeRateSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("Exchange-rate provider returned an invalid response.");
  const rates = parsed.data.rates;
  if (!rates.ETB || !rates.EUR) throw new Error("Exchange-rate provider did not return ETB and EUR rates.");

  return {
    base: "USD",
    asOf: parsed.data.time_last_update_utc,
    rates: { USD: 1, ETB: rates.ETB, EUR: rates.EUR },
  };
}
