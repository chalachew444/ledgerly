import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchExchangeRates } from "@/lib/exchange-rates";
import { createFinancialInsights } from "@/lib/insight-utils";
import type { CurrencyCode, FinanceTransaction } from "@/lib/finance-types";
import { prisma } from "@/lib/prisma";
import { getFinanceUserId } from "@/lib/server-user";

const querySchema = z.object({ currency: z.enum(["ETB", "USD", "EUR"]).default("ETB") });

export async function GET(request: Request) {
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Currency must be ETB, USD, or EUR." }, { status: 400 });
  try {
    const userId = await getFinanceUserId();
    if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const transactions = await prisma.transaction.findMany({
        where: { userId, type: "EXPENSE", date: { gte: start, lte: now } },
        include: { category: { select: { name: true, color: true } }, account: { select: { currency: true } } },
        orderBy: { date: "asc" },
      });
    const currency = parsed.data.currency;
    let exchangeRates: Awaited<ReturnType<typeof fetchExchangeRates>> | null = null;
    if (transactions.some((item) => (item.account?.currency ?? "ETB") !== currency)) {
      try {
        exchangeRates = await fetchExchangeRates();
      } catch (error) {
        console.error("GET /api/insights exchange rates unavailable", error);
      }
    }
    const financeTransactions: FinanceTransaction[] = transactions.map((item) => ({
      id: item.id,
      title: item.title,
      amount: Number(item.amount),
      type: item.type,
      isRecurring: item.isRecurring,
      frequency: item.frequency,
      accountId: item.accountId,
      currency: (item.account?.currency === "USD" || item.account?.currency === "EUR" ? item.account.currency : "ETB") as CurrencyCode,
      category: item.category.name,
      color: item.category.color,
      date: item.date.toISOString(),
      notes: item.notes,
    }));
    const insights = createFinancialInsights(financeTransactions, now, (amount, from) => (
      from === currency ? amount : exchangeRates ? amount / exchangeRates.rates[from] * exchangeRates.rates[currency] : null
    ));
    return NextResponse.json({ ...insights, currency, ratesUpdatedAt: exchangeRates?.asOf ?? null });
  } catch (error) {
    console.error("GET /api/insights failed", error);
    return NextResponse.json({ error: "Could not calculate financial insights." }, { status: 503 });
  }
}
