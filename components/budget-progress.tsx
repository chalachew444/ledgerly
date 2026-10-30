"use client";

import { CircleAlert } from "lucide-react";
import type { FinanceBudget } from "@/lib/finance-types";
import { useCurrency, type Currency } from "@/lib/currency-context";
import { formatCurrency } from "@/lib/utils";

export function BudgetProgress({
  budget,
  currency,
  action,
}: {
  budget: FinanceBudget;
  currency: Currency;
  action?: React.ReactNode;
}) {
  const { convertAmount } = useCurrency();
  const budgetCurrency = budget.currency ?? "ETB";
  const displayAmount = convertAmount(budget.amount, budgetCurrency);
  const displaySpent = budget.conversionUnavailable ? null : convertAmount(budget.spent, budgetCurrency);
  const percentage = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
  const progress = Math.min(percentage, 100);
  const over = budget.spent > budget.amount;
  const atLimit = budget.spent === budget.amount;
  const near = percentage >= 80 && !over;
  const tone = over
    ? { bar: "bg-[#cb7653]", text: "text-[#b05d3e] dark:text-[#e5a181]", label: "Over limit" }
    : atLimit
      ? { bar: "bg-[#d19a45]", text: "text-[#a87523] dark:text-[#e2bd77]", label: "At limit" }
    : near
      ? { bar: "bg-[#d19a45]", text: "text-[#a87523] dark:text-[#e2bd77]", label: "Near limit" }
      : { bar: "bg-[#77937a]", text: "text-[#68736b] dark:text-[#aab4ac]", label: "" };
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <i className="size-2 shrink-0 rounded-full" style={{ backgroundColor: budget.color }} />
          <span className="truncate text-xs font-medium">{budget.category}</span>
          {tone.label && <span className={`inline-flex shrink-0 items-center gap-1 text-[10px] font-medium ${tone.text}`}><CircleAlert className="size-3" />{tone.label}</span>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`text-[11px] ${tone.text}`}>{displaySpent === null || displayAmount === null ? "Rates unavailable" : <>{formatCurrency(displaySpent, currency)} <span className="text-[#a1a79f]">/ {formatCurrency(displayAmount, currency)}</span></>}</span>
          {action}
        </div>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-[#eeeee8] dark:bg-[#2b352e]"
        role="progressbar"
        aria-label={`${budget.category} budget usage`}
        aria-valuemin={0}
        aria-valuemax={budget.amount}
        aria-valuenow={Math.min(budget.spent, budget.amount)}
        aria-valuetext={budget.conversionUnavailable ? "Exchange rate unavailable" : `${Math.round(percentage)}% used`}
      >
        {!budget.conversionUnavailable && <div className={`h-full rounded-full transition-[width] ${tone.bar}`} style={{ width: `${progress}%` }} />}
      </div>
      <p className={`mt-1.5 text-[10px] ${tone.text}`}>
        {displaySpent === null || displayAmount === null ? "Currency conversion unavailable" : over ? `Over by ${formatCurrency(displayAmount - displaySpent, currency)}` : `${formatCurrency(displayAmount - displaySpent, currency)} remaining`}
      </p>
    </div>
  );
}
