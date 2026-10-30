"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CalendarDays, Download, Ellipsis, Pencil, Plus, Search, Trash2, WalletCards } from "lucide-react";
import { TransactionDialog } from "@/components/transaction-dialog";
import { BudgetProgress } from "@/components/budget-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadBudgets, loadTransactions, removeBudget, removeTransaction, saveBudget, saveTransaction } from "@/lib/client-store";
import { demoBudgets, demoTransactions, transactionCategories } from "@/lib/demo-data";
import type { FinanceBudget, FinanceTransaction, TransactionType } from "@/lib/finance-types";
import { formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/lib/currency-context";

type Period = "all" | "week" | "month" | "year";

function dateInPeriod(value: string, period: Period, now: Date) {
  if (period === "all") return true;
  const date = new Date(value);
  if (period === "year") return date.getFullYear() === now.getFullYear();
  if (period === "month") return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  const start = new Date(now);
  start.setDate(now.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  return date >= start && date <= now;
}

export default function TransactionsPage() {
  const { currency, convertAmount } = useCurrency();
  const [transactions, setTransactions] = useState<FinanceTransaction[]>(demoTransactions);
  const [budgets, setBudgets] = useState<FinanceBudget[]>(demoBudgets);
  const [period, setPeriod] = useState<Period>("month");
  const [category, setCategory] = useState("all");
  const [type, setType] = useState<"all" | TransactionType>("all");
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceTransaction>();
  const [defaultTransactionDate, setDefaultTransactionDate] = useState("");
  const [budgetCategory, setBudgetCategory] = useState("Food / Cafe");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [notice, setNotice] = useState("");
  const [today, setToday] = useState<string | null>(null);

  async function refresh() {
    const next = await loadTransactions();
    setTransactions(next);
    setBudgets(await loadBudgets(next, convertAmount));
  }

  useEffect(() => {
    let active = true;
    void loadTransactions().then(async (nextTransactions) => {
      const nextBudgets = await loadBudgets(nextTransactions, convertAmount);
      if (active) startTransition(() => { setTransactions(nextTransactions); setBudgets(nextBudgets); setToday(new Date().toISOString().slice(0, 10)); });
    });
    return () => { active = false; };
  }, [convertAmount]);

  const categories = useMemo(() => [...new Set([...transactionCategories, ...transactions.map((item) => item.category)])].sort(), [transactions]);
  const filtered = useMemo(() => {
    const now = new Date(`${today ?? "2026-10-28"}T12:00:00.000Z`);
    const search = query.trim().toLowerCase();
    return [...transactions].filter((item) => dateInPeriod(item.date, period, now)
      && (category === "all" || item.category === category)
      && (type === "all" || item.type === type)
      && (!search || `${item.title} ${item.category} ${item.notes ?? ""}`.toLowerCase().includes(search)))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, period, category, type, query, today]);

  async function deleteItem(item: FinanceTransaction) {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    await removeTransaction(item.id);
    await refresh();
  }

  async function submitBudget(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveBudget({ category: budgetCategory, amount: Number(budgetAmount), currency, period: "MONTHLY" });
    setBudgetAmount("");
    setNotice(`${budgetCategory} monthly limit saved.`);
    await refresh();
    window.setTimeout(() => setNotice(""), 3000);
  }

  function exportTransactions() {
    const headers = ["Title", "Type", "Amount", "Currency", "Category", "Date", "Recurring", "Frequency", "Notes"];
    const rows = filtered.map((item) => {
      const converted = convertAmount(item.amount, item.currency);
      return [item.title, item.type, (converted ?? item.amount).toFixed(2), converted === null ? item.currency : currency, item.category, item.date.slice(0, 10), item.isRecurring ? "Yes" : "No", item.isRecurring ? item.frequency : "", item.notes ?? ""];
    });
    const csvCell = (value: string | number) => {
      let text = String(value);
      if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text.replaceAll('"', '""')}"`;
    };
    const content = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const file = new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ledgerly-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function addTransaction() {
    setEditing(undefined);
    setDefaultTransactionDate(new Date().toISOString().slice(0, 10));
    setDialogOpen(true);
  }

  const incomeAmounts = filtered.filter((item) => item.type === "INCOME").map((item) => convertAmount(item.amount, item.currency));
  const expenseAmounts = filtered.filter((item) => item.type === "EXPENSE").map((item) => convertAmount(item.amount, item.currency));
  const totalIncome = incomeAmounts.some((amount) => amount === null) ? null : incomeAmounts.reduce<number>((sum, amount) => sum + (amount ?? 0), 0);
  const totalExpense = expenseAmounts.some((amount) => amount === null) ? null : expenseAmounts.reduce<number>((sum, amount) => sum + (amount ?? 0), 0);
  const ratesUnavailable = totalIncome === null || totalExpense === null;

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#819087]">Money movement</p><h1 className="text-[27px] font-semibold leading-tight">Transactions</h1><p className="mt-2 text-sm text-[#7b857c] dark:text-[#aab4ac]">A searchable record of income and spending.</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={exportTransactions} disabled={!filtered.length}><Download className="size-4" /> Export CSV</Button><Button onClick={addTransaction}><Plus className="size-4" /> Add transaction</Button></div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <MiniSummary label="Matching income" value={totalIncome} icon={<ArrowDownLeft className="size-4" />} color="text-[#60836a]" />
        <MiniSummary label="Matching expenses" value={totalExpense} icon={<ArrowUpRight className="size-4" />} color="text-[#bd7958]" />
        <MiniSummary label="Net for selection" value={totalIncome === null || totalExpense === null ? null : totalIncome - totalExpense} icon={<WalletCards className="size-4" />} color="text-[#657c70]" />
      </section>
      {ratesUnavailable && <p role="status" className="rounded-md border border-[#eadfbd] bg-[#fcf8eb] px-4 py-3 text-xs text-[#8b743c] dark:border-[#51462d] dark:bg-[#2f2a1e]">Live exchange rates are unavailable for one or more matching wallets; converted totals are hidden.</p>}

      <section className="rounded-md border border-[#e7e4dc] bg-[#fffefa] dark:border-[#2d3932] dark:bg-[#19211d]">
        <div className="flex flex-col gap-3 border-b border-[#eeece6] p-4 dark:border-[#2d3932] sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">All transactions</h2><p className="mt-1 text-xs text-[#89938a]">{filtered.length} {filtered.length === 1 ? "entry" : "entries"}</p></div><div className="flex items-center gap-1 rounded-md bg-[#eeeee8] p-1 dark:bg-[#202a24]">{(["all", "week", "month", "year"] as const).map((value) => <button key={value} onClick={() => setPeriod(value)} className={`rounded px-2.5 py-1.5 text-[11px] font-medium capitalize ${period === value ? "bg-white text-[#334c3d] shadow-sm dark:bg-[#38483d] dark:text-white" : "text-[#78827a] dark:text-[#aab4ac]"}`}>{value === "all" ? "All time" : value === "week" ? "7 days" : value === "month" ? "Month" : "Year"}</button>)}</div></div>
          <div className="grid gap-2 sm:grid-cols-[minmax(200px,1fr)_180px_150px]">
            <label className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#929990]" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search transactions" className="pl-9" /></label>
            <select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 rounded-md border border-[#ddd9d2] bg-white px-3 text-xs text-[#455148] outline-none dark:border-[#35423d] dark:bg-[#19221e] dark:text-[#e7eae6]"><option value="all">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>
            <select aria-label="Filter by transaction type" value={type} onChange={(event) => setType(event.target.value as typeof type)} className="h-10 rounded-md border border-[#ddd9d2] bg-white px-3 text-xs text-[#455148] outline-none dark:border-[#35423d] dark:bg-[#19221e] dark:text-[#e7eae6]"><option value="all">All types</option><option value="INCOME">Income</option><option value="EXPENSE">Expense</option></select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-172.5 text-left">
            <thead className="bg-[#f8f7f3] text-[10px] font-semibold uppercase tracking-[0.09em] text-[#8b948b] dark:bg-[#202a24]"><tr><th className="px-5 py-3">Description</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Date</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-[#f0eee8] dark:divide-[#2a352e]">
              {filtered.map((item) => { const converted = convertAmount(item.amount, item.currency); return <tr key={item.id} className="group hover:bg-[#fcfbf8] dark:hover:bg-[#202a24]"><td className="px-5 py-3.5"><div className="flex items-center gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-md" style={{ backgroundColor: `${item.color}20`, color: item.color }}>{item.type === "INCOME" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}</span><div className="min-w-0"><p className="truncate text-xs font-medium">{item.title}</p>{(item.isRecurring || item.notes) && <p className="mt-0.5 max-w-65 truncate text-[10px] text-[#929990]">{item.isRecurring ? `Repeats ${item.frequency.toLowerCase()}` : item.notes}</p>}</div></div></td><td className="px-4 py-3.5"><span className="inline-flex items-center gap-2 text-xs text-[#68736b] dark:text-[#b2bbb4]"><i className="size-2 rounded-full" style={{ backgroundColor: item.color }} />{item.category}</span></td><td className="px-4 py-3.5 text-xs text-[#7e8980]">{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(item.date))}</td><td className={`px-4 py-3.5 text-right text-xs font-semibold ${item.type === "INCOME" ? "text-[#5d8665] dark:text-[#a9c5ac]" : "text-[#37453c] dark:text-[#d9e0da]"}`}>{item.type === "INCOME" ? "+" : "−"}{formatCurrency(converted ?? item.amount, converted === null ? item.currency : currency)}</td><td className="px-4 py-3.5"><div className="flex justify-end gap-1"><button title="Edit transaction" aria-label={`Edit ${item.title}`} onClick={() => { setEditing(item); setDialogOpen(true); }} className="grid size-8 place-items-center rounded text-[#7f8a81] hover:bg-[#eeeee8] hover:text-[#314438] dark:hover:bg-[#303b34]"><Pencil className="size-3.5" /></button><button title="Delete transaction" aria-label={`Delete ${item.title}`} onClick={() => void deleteItem(item)} className="grid size-8 place-items-center rounded text-[#9a847a] hover:bg-[#f7e9e3] hover:text-[#aa583e] dark:hover:bg-[#3b2b25]"><Trash2 className="size-3.5" /></button><button title="More transaction details" aria-label={`More details for ${item.title}`} onClick={() => { setEditing(item); setDialogOpen(true); }} className="grid size-8 place-items-center rounded text-[#9aa198] hover:bg-[#eeeee8] dark:hover:bg-[#303b34]"><Ellipsis className="size-4" /></button></div></td></tr>; })}
              {!filtered.length && <tr><td colSpan={5} className="px-5 py-16 text-center"><CalendarDays className="mx-auto mb-3 size-5 text-[#99a198]" /><p className="text-sm font-medium">No matching transactions</p><p className="mt-1 text-xs text-[#89938a]">Try another date range or clear your filters.</p></td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section id="budgets" className="scroll-mt-24 rounded-md border border-[#e7e4dc] bg-[#fffefa] dark:border-[#2d3932] dark:bg-[#19211d]">
        <div className="flex items-start justify-between gap-4 border-b border-[#eeece6] px-4 py-4 dark:border-[#2d3932] sm:px-5"><div><h2 className="text-sm font-semibold">Category budgets</h2><p className="mt-1 text-xs text-[#89938a]">Monthly spending limits with over-budget alerts.</p></div><WalletCards className="size-4 text-[#718078]" /></div>
        <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
          <div className="space-y-4">{budgets.map((budget) => <div key={budget.id} className="border-b border-[#f0eee8] pb-4 last:border-0 dark:border-[#2a352e]"><BudgetProgress budget={budget} currency={currency} action={<button aria-label={`Delete ${budget.category} budget`} title="Delete budget" onClick={async () => { await removeBudget(budget.id); await refresh(); }} className="grid size-7 place-items-center rounded text-[#9a847a] hover:bg-[#f7e9e3] hover:text-[#aa583e]"><Trash2 className="size-3.5" /></button>} /></div>)}{!budgets.length && <p className="text-sm text-[#89938a]">No monthly budgets yet.</p>}</div>
          <form onSubmit={submitBudget} className="space-y-3 rounded-md bg-[#f7f6f2] p-4 dark:bg-[#202a24]"><div><h3 className="text-xs font-semibold">Set a category limit</h3><p className="mt-1 text-[11px] text-[#89938a]">Example: Food / Cafe · 2,000 {currency}</p></div><label className="block space-y-1.5 text-[11px] font-medium text-[#68736b] dark:text-[#b2bbb4]">Category<select value={budgetCategory} onChange={(event) => setBudgetCategory(event.target.value)} className="h-10 w-full rounded-md border border-[#ddd9d2] bg-white px-3 text-xs outline-none dark:border-[#35423d] dark:bg-[#19221e]">{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label className="block space-y-1.5 text-[11px] font-medium text-[#68736b] dark:text-[#b2bbb4]">Monthly limit ({currency})<Input required min="0.01" step="0.01" type="number" value={budgetAmount} onChange={(event) => setBudgetAmount(event.target.value)} placeholder="2000" /></label><Button type="submit" className="w-full"><Plus className="size-4" /> Save budget</Button>{notice && <p role="status" className="text-center text-[11px] text-[#55785b]">{notice}</p>}</form>
        </div>
      </section>
      <TransactionDialog key={`${dialogOpen ? "open" : "closed"}-${dialogOpen ? editing?.id ?? "new" : "idle"}`} open={dialogOpen} onOpenChange={setDialogOpen} transaction={editing} defaultDate={defaultTransactionDate} onSave={async (values) => { await saveTransaction(values); await refresh(); }} />
    </div>
  );
}

function MiniSummary({ label, value, icon, color }: { label: string; value: number | null; icon: React.ReactNode; color: string }) {
  const { currency } = useCurrency();
  return <article className="flex items-center justify-between rounded-md border border-[#e7e4dc] bg-[#fffefa] px-4 py-3.5 dark:border-[#2d3932] dark:bg-[#19211d]"><div><p className="text-[11px] text-[#89938a]">{label}</p><p className="mt-1 text-lg font-semibold">{value === null ? "Rates unavailable" : formatCurrency(value, currency)}</p></div><span className={`grid size-8 place-items-center rounded-md bg-[#f0f1ec] dark:bg-[#29352f] ${color}`}>{icon}</span></article>;
}