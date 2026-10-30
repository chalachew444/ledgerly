"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Lightbulb, RefreshCw } from "lucide-react";
import { loadTransactions } from "@/lib/client-store";
import { demoTransactions } from "@/lib/demo-data";
import { createFinancialInsights } from "@/lib/insight-utils";
import type { FinanceInsights } from "@/lib/finance-types";
import { useCurrency } from "@/lib/currency-context";
import { formatCurrency } from "@/lib/utils";
import { SpendingCategoryChart, WeekComparisonChart } from "@/components/insights-charts";

export function InsightsPage() {
  const { currency, convertAmount, ratesUpdatedAt } = useCurrency();
  const [insights, setInsights] = useState<FinanceInsights>(() => createFinancialInsights(demoTransactions, new Date("2026-10-28T12:00:00.000Z"), convertAmount));
  const [loading, setLoading] = useState(true);
  const [usingLocalData, setUsingLocalData] = useState(false);

  useEffect(() => {
    let active = true;
    async function refresh() {
      setLoading(true);
      const transactions = await loadTransactions();
      try {
        const response = await fetch(`/api/insights?currency=${currency}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Insights API unavailable");
        const data = await response.json() as FinanceInsights;
        if (active) {
          setInsights(data);
          setUsingLocalData(false);
        }
      } catch {
        if (active) {
          setInsights(createFinancialInsights(transactions, new Date(), convertAmount));
          setUsingLocalData(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void refresh();
    return () => { active = false; };
  }, [currency, convertAmount]);

  const change = insights.totals.lastMonth
    ? (insights.totals.thisMonth - insights.totals.lastMonth) / insights.totals.lastMonth * 100
    : null;

  return <div className="space-y-7">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#819087]">Financial health</p><h1 className="text-[27px] font-semibold">Spending insights</h1><p className="mt-2 text-sm text-[#7b857c] dark:text-[#aab4ac]">Monthly patterns and a rolling week-over-week comparison in {currency}.</p></div><button onClick={() => window.location.reload()} className="flex items-center gap-2 self-start rounded-md border border-[#e7e4dc] bg-[#fffefa] px-3 py-2 text-xs text-[#68736b] dark:border-[#2d3932] dark:bg-[#19211d] dark:text-[#b2bbb4]"><RefreshCw className="size-3.5" /> Refresh</button></header>

    {usingLocalData && <p role="status" className="rounded-md border border-[#eadfbd] bg-[#fcf8eb] px-4 py-3 text-xs text-[#8b743c] dark:border-[#51462d] dark:bg-[#2f2a1e]">Showing locally available transaction insights. Connect the database for server-generated results.</p>}
    {ratesUpdatedAt && <p className="text-[11px] text-[#89938a]">Exchange quotes updated {new Date(ratesUpdatedAt).toLocaleString()}.</p>}

    <section className="grid gap-3 sm:grid-cols-3">
      <InsightMetric label="Spent this month" value={insights.totals.thisMonth} currency={currency} detail="Converted to your selected currency" />
      <InsightMetric label="Previous month" value={insights.totals.lastMonth} currency={currency} detail="Full previous calendar month" />
      <article className="rounded-md border border-[#e7e4dc] bg-[#fffefa] p-4 dark:border-[#2d3932] dark:bg-[#19211d]"><div className="flex items-center justify-between"><span className="text-xs font-medium text-[#7b857c] dark:text-[#aab4ac]">Monthly spend trend</span>{change !== null && change >= 0 ? <ArrowUpRight className="size-4 text-[#b05d3e]" /> : <ArrowDownRight className="size-4 text-[#60836a]" />}</div><p className="mt-4 text-[23px] font-semibold">{change === null ? "—" : `${change > 0 ? "+" : ""}${change.toFixed(1)}%`}</p><p className="mt-1 text-[11px] text-[#929990]">Compared with previous month</p></article>
    </section>

    <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
      <article className="rounded-md border border-[#e7e4dc] bg-[#fffefa] p-4 dark:border-[#2d3932] dark:bg-[#19211d] sm:p-5"><div className="mb-4"><h2 className="text-sm font-semibold">Monthly spending by category</h2><p className="mt-1 text-xs text-[#89938a]">Current and previous month totals</p></div><div className="h-72"><SpendingCategoryChart categories={insights.categories} currency={currency} /></div></article>
      <article className="rounded-md border border-[#e7e4dc] bg-[#fffefa] p-4 dark:border-[#2d3932] dark:bg-[#19211d] sm:p-5"><div className="mb-4"><h2 className="text-sm font-semibold">Week-over-week spending</h2><p className="mt-1 text-xs text-[#89938a]">Last 7 days compared with the 7 days before</p></div><div className="h-56"><WeekComparisonChart weeks={insights.weeks} currency={currency} /></div><div className="mt-3 flex gap-4 text-[10px] text-[#778078]"><span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-[#aebdb0]" /> Previous 7 days</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-[#6e9675]" /> Last 7 days</span></div></article>
    </section>

    <section className="rounded-md border border-[#e7e4dc] bg-[#fffefa] p-4 dark:border-[#2d3932] dark:bg-[#19211d] sm:p-5"><div className="mb-4 flex items-center gap-2"><Lightbulb className="size-4 text-[#bc8b42]" /><div><h2 className="text-sm font-semibold">Smart spending insights</h2><p className="mt-1 text-xs text-[#89938a]">Automatically generated from your transaction history.</p></div></div><div className="grid gap-3 md:grid-cols-2">{insights.insights.map((message, index) => <p key={`${index}-${message}`} className="rounded-md bg-[#f7f6f2] p-3 text-xs leading-relaxed text-[#536157] dark:bg-[#202a24] dark:text-[#c2ccc4]">{message}</p>)}</div></section>
    {loading && <p className="text-xs text-[#89938a]">Updating insights…</p>}
  </div>;
}

function InsightMetric({ label, value, currency, detail }: { label: string; value: number; currency: "ETB" | "USD" | "EUR"; detail: string }) {
  return <article className="rounded-md border border-[#e7e4dc] bg-[#fffefa] p-4 dark:border-[#2d3932] dark:bg-[#19211d]"><p className="text-xs font-medium text-[#7b857c] dark:text-[#aab4ac]">{label}</p><p className="mt-4 text-[23px] font-semibold">{formatCurrency(value, currency)}</p><p className="mt-1 text-[11px] text-[#929990]">{detail}</p></article>;
}
