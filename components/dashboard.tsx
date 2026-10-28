"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, CircleDollarSign, Plus, Wallet, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionDialog } from "@/components/transaction-dialog";
import { CategoryChart, MonthlyChart } from "@/components/finance-charts";
import { loadBudgets, loadTransactions, saveTransaction } from "@/lib/client-store";
import { demoBudgets, demoTransactions } from "@/lib/demo-data";
import type { FinanceBudget, FinanceTransaction } from "@/lib/finance-types";
import { formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/lib/currency-context";

type Period = "week" | "month" | "year";

function includesDate(value: string, period: Period, now: Date) {
  const date = new Date(value);
  if (period === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return date >= start && date <= now;
  }
  if (period === "year") return date.getFullYear() === now.getFullYear();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

export function Dashboard() {
  const { currency } = useCurrency();
  const [transactions, setTransactions] = useState<FinanceTransaction[]>(demoTransactions);
  const [budgets, setBudgets] = useState<FinanceBudget[]>(demoBudgets);
  const [period, setPeriod] = useState<Period>("month");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [defaultTransactionDate, setDefaultTransactionDate] = useState("");
  const [now, setNow] = useState<Date | null>(null);
  const reportDate = now ?? demoReferenceDate;

  async function refresh() {
    const next = await loadTransactions();
    setTransactions(next);
    setBudgets(await loadBudgets(next));
    setNow(new Date());
  }

  useEffect(() => {
    let active = true;
    void loadTransactions().then(async (nextTransactions) => {
      const nextBudgets = await loadBudgets(nextTransactions);
      if (active) startTransition(() => { setTransactions(nextTransactions); setBudgets(nextBudgets); setNow(new Date()); });
    });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => transactions.filter((item) => includesDate(item.date, period, reportDate)), [transactions, period, reportDate]);
  const totals = useMemo(() => filtered.reduce((acc, item) => {
    acc[item.type === "INCOME" ? "income" : "expense"] += item.amount;
    return acc;
  }, { income: 0, expense: 0 }), [filtered]);
  const monthly = useMemo(() => {
    const points = Array.from({ length: 6 }, (_, index) => {
      const month = new Date(reportDate.getFullYear(), reportDate.getMonth() - 5 + index, 1);
      return { key: `${month.getFullYear()}-${month.getMonth()}`, month: month.toLocaleDateString("en", { month: "short" }), income: 0, expense: 0 };
    });
    const lookup = new Map(points.map((point) => [point.key, point]));
    for (const transaction of transactions) {
      const date = new Date(transaction.date);
      const point = lookup.get(`${date.getFullYear()}-${date.getMonth()}`);
      if (point) point[transaction.type === "INCOME" ? "income" : "expense"] += transaction.amount;
    }
    return points;
  }, [transactions, reportDate]);
  const categoryExpenses = useMemo(() => {
    const groups = new Map<string, { name: string; value: number; color: string }>();
    for (const transaction of filtered) {
      if (transaction.type !== "EXPENSE") continue;
      const group = groups.get(transaction.category) ?? { name: transaction.category, value: 0, color: transaction.color };
      group.value += transaction.amount;
      groups.set(transaction.category, group);
    }
    return [...groups.values()].sort((a, b) => b.value - a.value);
  }, [filtered]);
  const overspent = budgets.filter((budget) => budget.spent > budget.amount);
  const budgetRemaining = budgets.reduce((sum, budget) => sum + Math.max(0, budget.amount - budget.spent), 0);
  const recent = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  function addTransaction() {
    setDefaultTransactionDate(new Date().toISOString().slice(0, 10));
    setDialogOpen(true);
  }

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#819087]">Finance overview{now ? ` · ${now.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}` : " · Your summary"}</p><h1 className="text-[27px] font-semibold leading-tight text-[#26352e] dark:text-[#edf0eb] sm:text-[30px]">A clearer view of your money.</h1><p className="mt-2 text-sm text-[#7b857c] dark:text-[#aab4ac]">Personal and business finances, together in one place.</p></div>
        <Button onClick={addTransaction}><Plus className="size-4" /> Add transaction</Button>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e3dc] pb-3 dark:border-[#2d3932]">
        <div className="flex items-center gap-1 rounded-md bg-[#eeeee8] p-1 dark:bg-[#202a24]" aria-label="Dashboard date range">{(["week", "month", "year"] as const).map((value) => <button key={value} onClick={() => setPeriod(value)} className={`rounded px-3 py-1.5 text-xs font-medium capitalize ${period === value ? "bg-white text-[#334c3d] shadow-sm dark:bg-[#38483d] dark:text-white" : "text-[#78827a] dark:text-[#aab4ac]"}`}>{value === "week" ? "7 days" : value === "month" ? "This month" : "This year"}</button>)}</div>
        <span className="text-[11px] text-[#929990]">Amounts shown in {currency === "ETB" ? "Ethiopian birr" : "US dollars"} ({currency})</span>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total income" value={totals.income} detail="Money received" icon={<ArrowDownLeft className="size-4" />} tone="green" />
        <SummaryCard label="Total expenses" value={totals.expense} detail="Money spent" icon={<ArrowUpRight className="size-4" />} tone="coral" />
        <SummaryCard label="Net balance" value={totals.income - totals.expense} detail="Income minus expenses" icon={<Wallet className="size-4" />} tone="olive" />
        <SummaryCard label="Budget remaining" value={budgetRemaining} detail="Across monthly limits" icon={<CircleDollarSign className="size-4" />} tone="slate" />
      </section>

      {overspent.length > 0 && <div className="flex flex-col justify-between gap-3 rounded-md border border-[#efd2c5] bg-[#fff4ee] px-4 py-3 dark:border-[#684536] dark:bg-[#34251f] sm:flex-row sm:items-center"><div><p className="text-sm font-semibold text-[#9b5638] dark:text-[#e5a181]">Budget limit reached</p><p className="mt-0.5 text-xs text-[#8b6759] dark:text-[#c7a290]">{overspent.map((item) => `${item.category} is ${formatCurrency(item.spent - item.amount, currency)} over`).join(" · ")}</p></div><Link href="/transactions#budgets" className="flex items-center gap-1 text-xs font-medium text-[#98583e] dark:text-[#e5a181]">Review spending <ArrowRight className="size-3.5" /></Link></div>}

      <section className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
        <div className="rounded-md border border-[#e7e4dc] bg-[#fffefa] p-4 dark:border-[#2d3932] dark:bg-[#19211d] sm:p-5"><div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="text-sm font-semibold">Income & expenses</h2><p className="mt-1 text-xs text-[#89938a]">Monthly comparison · last 6 months</p></div><div className="flex gap-3 pt-1 text-[10px] text-[#778078]"><span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-[#6e9675]" /> Income</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-[#d68b68]" /> Expenses</span></div></div><div className="h-56.5 w-full"><MonthlyChart data={monthly} currency={currency} /></div></div>
        <div className="rounded-md border border-[#e7e4dc] bg-[#fffefa] p-4 dark:border-[#2d3932] dark:bg-[#19211d] sm:p-5"><div className="mb-3"><h2 className="text-sm font-semibold">Where it goes</h2><p className="mt-1 text-xs text-[#89938a]">Expenses by category · selected period</p></div><div className="relative h-42.5"><CategoryChart data={categoryExpenses} currency={currency} /><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-[10px] text-[#89938a]">Expenses</span><span className="mt-0.5 text-sm font-semibold">{formatCurrency(totals.expense, currency)}</span></div></div><div className="mt-2 space-y-2">{categoryExpenses.slice(0, 4).map((item) => <div key={item.name} className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-[#68736b] dark:text-[#b2bbb4]"><i className="size-2 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span><span className="font-medium">{formatCurrency(item.value, currency)}</span></div>)}{categoryExpenses.length === 0 && <p className="text-center text-[11px] text-[#89938a]">Your category breakdown will appear here.</p>}</div></div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-md border border-[#e7e4dc] bg-[#fffefa] dark:border-[#2d3932] dark:bg-[#19211d]"><div className="flex items-center justify-between border-b border-[#eeece6] px-4 py-4 dark:border-[#2d3932] sm:px-5"><div><h2 className="text-sm font-semibold">Recent transactions</h2><p className="mt-1 text-xs text-[#89938a]">Your latest account activity</p></div><Link href="/transactions" className="flex items-center gap-1 text-xs font-medium text-[#526d5b] dark:text-[#b0c5b3]">View all <ArrowRight className="size-3.5" /></Link></div><div className="divide-y divide-[#f0eee8] dark:divide-[#2a352e]">{recent.length ? recent.map((item) => <TransactionRow key={item.id} transaction={item} />) : <div className="px-5 py-10 text-center text-sm text-[#89938a]">No transactions yet. Add your first entry to begin.</div>}</div></div>
        <div className="rounded-md border border-[#e7e4dc] bg-[#fffefa] dark:border-[#2d3932] dark:bg-[#19211d]"><div className="flex items-center justify-between border-b border-[#eeece6] px-4 py-4 dark:border-[#2d3932] sm:px-5"><div><h2 className="text-sm font-semibold">Monthly budgets</h2><p className="mt-1 text-xs text-[#89938a]">Category limits and progress</p></div><Link href="/transactions#budgets" aria-label="Manage budgets" className="rounded p-1.5 text-[#78827a] hover:bg-[#f1f0eb] dark:hover:bg-[#29352f]"><WalletCards className="size-4" /></Link></div><div className="space-y-4 p-4 sm:p-5">{budgets.map((budget) => { const progress = budget.amount > 0 ? Math.min((budget.spent / budget.amount) * 100, 100) : 0; const exceeded = budget.spent > budget.amount; return <div key={budget.id}><div className="mb-2 flex items-center justify-between gap-2"><span className="flex min-w-0 items-center gap-2 text-xs font-medium"><i className="size-2 shrink-0 rounded-full" style={{ backgroundColor: budget.color }} /><span className="truncate">{budget.category}</span></span><span className={`shrink-0 text-[11px] ${exceeded ? "font-semibold text-[#b05d3e]" : "text-[#7e8980]"}`}>{formatCurrency(budget.spent, currency)} <span className="text-[#a1a79f]">/ {formatCurrency(budget.amount, currency)}</span></span></div><div className="h-1.5 overflow-hidden rounded-full bg-[#eeeee8] dark:bg-[#2b352e]"><div className={`h-full rounded-full ${exceeded ? "bg-[#cb7653]" : "bg-[#77937a]"}`} style={{ width: `${progress}%` }} /></div>{exceeded && <p className="mt-1 text-[10px] text-[#b05d3e]">Over by {formatCurrency(budget.spent - budget.amount, currency)}</p>}</div>; })}{!budgets.length && <p className="text-xs text-[#89938a]">Create a category budget to track your spending.</p>}<Link href="/transactions#budgets" className="inline-flex items-center gap-1 pt-1 text-xs font-medium text-[#526d5b] dark:text-[#b0c5b3]">Manage budgets <ArrowRight className="size-3.5" /></Link></div></div>
      </section>
      <TransactionDialog key={`${dialogOpen ? "open" : "closed"}-${dialogOpen ? "new" : "idle"}`} open={dialogOpen} onOpenChange={setDialogOpen} defaultDate={defaultTransactionDate} onSave={async (values) => { await saveTransaction(values); await refresh(); }} />
    </div>
  );
}

function SummaryCard({ label, value, detail, icon, tone }: { label: string; value: number; detail: string; icon: React.ReactNode; tone: "green" | "coral" | "olive" | "slate" }) {
  const { currency } = useCurrency();
  const tones = { green: "bg-[#e6eee5] text-[#53785a] dark:bg-[#293b30] dark:text-[#b2c9b2]", coral: "bg-[#f5e9e2] text-[#b87352] dark:bg-[#3c2c25] dark:text-[#e3ad92]", olive: "bg-[#edf0e3] text-[#79834f] dark:bg-[#343b2b] dark:text-[#c2c99a]", slate: "bg-[#e8edeb] text-[#627c73] dark:bg-[#293834] dark:text-[#b3c9c1]" };
  return <article className="rounded-md border border-[#e7e4dc] bg-[#fffefa] p-4 dark:border-[#2d3932] dark:bg-[#19211d] sm:p-5"><div className="flex items-center justify-between"><span className="text-xs font-medium text-[#7b857c] dark:text-[#aab4ac]">{label}</span><span className={`grid size-8 place-items-center rounded-md ${tones[tone]}`}>{icon}</span></div><p className="mt-4 text-[23px] font-semibold">{formatCurrency(value, currency)}</p><p className="mt-1 text-[11px] text-[#929990]">{detail}</p></article>;
}

function TransactionRow({ transaction }: { transaction: FinanceTransaction }) {
  const { currency } = useCurrency();
  const income = transaction.type === "INCOME";
  const date = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(transaction.date));
  return <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5"><div className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-md" style={{ backgroundColor: `${transaction.color}20` }}><i className="size-2 rounded-full" style={{ backgroundColor: transaction.color }} /></span><div className="min-w-0"><p className="truncate text-xs font-medium">{transaction.title}</p><p className="mt-1 truncate text-[10px] text-[#8d968e]">{transaction.category} <span className="px-1">·</span> {date}</p></div></div><span className={`shrink-0 text-xs font-semibold ${income ? "text-[#5d8665] dark:text-[#a9c5ac]" : "text-[#37453c] dark:text-[#d9e0da]"}`}>{income ? "+" : "−"}{formatCurrency(transaction.amount, currency)}</span></div>;
}

const demoReferenceDate = new Date("2026-10-28T12:00:00.000Z");