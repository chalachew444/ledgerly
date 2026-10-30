import type { CurrencyCode, FinanceInsights, FinanceTransaction } from "@/lib/finance-types";

export function createFinancialInsights(
  transactions: FinanceTransaction[],
  now: Date,
  convert: (amount: number, from: CurrencyCode) => number | null,
): FinanceInsights {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = monthStart;
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - 6);
  thisWeekStart.setHours(0, 0, 0, 0);
  const previousWeekStart = new Date(thisWeekStart);
  previousWeekStart.setDate(thisWeekStart.getDate() - 7);
  const categories = new Map<string, { name: string; color: string; current: number; previous: number }>();
  let thisMonthTotal = 0;
  let lastMonthTotal = 0;
  let currentWeekTotal = 0;
  let previousWeekTotal = 0;
  let unavailableConversions = 0;

  for (const transaction of transactions) {
    if (transaction.type !== "EXPENSE") continue;
    const date = new Date(transaction.date);
    const inCurrentMonth = date >= monthStart && date <= now;
    const inPreviousMonth = date >= previousMonthStart && date < previousMonthEnd;
    const inCurrentWeek = date >= thisWeekStart && date <= now;
    const inPreviousWeek = date >= previousWeekStart && date < thisWeekStart;
    if (!inCurrentMonth && !inPreviousMonth && !inCurrentWeek && !inPreviousWeek) continue;
    const value = convert(transaction.amount, transaction.currency);
    if (value === null) {
      unavailableConversions += 1;
      continue;
    }
    if (inCurrentMonth) thisMonthTotal += value;
    if (inPreviousMonth) lastMonthTotal += value;
    if (inCurrentWeek) currentWeekTotal += value;
    if (inPreviousWeek) previousWeekTotal += value;
    const group = categories.get(transaction.category) ?? { name: transaction.category, color: transaction.color, current: 0, previous: 0 };
    if (inCurrentMonth) group.current += value;
    if (inPreviousMonth) group.previous += value;
    categories.set(transaction.category, group);
  }

  const categoryRows = [...categories.values()]
    .map((item) => ({
      ...item,
      share: thisMonthTotal ? item.current / thisMonthTotal : 0,
      previousShare: lastMonthTotal ? item.previous / lastMonthTotal : 0,
    }))
    .sort((a, b) => b.current - a.current);
  const insights = categoryRows.slice(0, 3).filter((item) => item.current > 0).map((item) => {
    const share = Math.round(item.share * 100);
    const change = Math.round((item.share - item.previousShare) * 100);
    const baseline = lastMonthTotal
      ? change > 0 ? `${change} percentage points above last month's share` : `${Math.abs(change)} percentage points below last month's share`
      : "no previous-month baseline is available";
    return `${share}% of this month's expenses went to ${item.name}, ${baseline}.`;
  });
  if (!insights.length) insights.push("Add expense transactions to see your monthly spending patterns.");
  if (unavailableConversions) insights.push("Some foreign-currency expenses are excluded until exchange rates are available.");

  return {
    totals: { thisMonth: thisMonthTotal, lastMonth: lastMonthTotal },
    categories: categoryRows,
    weeks: [
      { week: "7-day comparison", current: currentWeekTotal, previous: previousWeekTotal },
    ],
    insights,
  };
}
