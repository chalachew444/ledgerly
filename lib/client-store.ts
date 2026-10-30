import { categoryColors, demoAccounts, demoBudgets, demoTasks, demoTransactions } from "@/lib/demo-data";
import type { CurrencyCode, FinanceAccount, FinanceBudget, FinanceTask, FinanceTransaction, TaskStatus, TransactionType } from "@/lib/finance-types";

const transactionKey = "ledgerly-transactions-v1";
const accountKey = "ledgerly-accounts-v1";
const transferKey = "ledgerly-transfers-v1";
const budgetKey = "ledgerly-budgets-v1";
const taskKey = "ledgerly-tasks-v1";
const databaseEnabled = process.env.NEXT_PUBLIC_DATABASE_ENABLED === "true";

function fromApiTransaction(value: Record<string, unknown>): FinanceTransaction {
  const category = typeof value.category === "object" && value.category !== null
    ? value.category as { name?: string; color?: string }
    : { name: String(value.category ?? "Other"), color: undefined };
  const name = category.name ?? "Other";
  const account = typeof value.account === "object" && value.account !== null
    ? value.account as { id?: string; currency?: CurrencyCode }
    : null;
  return {
    id: String(value.id),
    title: String(value.title),
    amount: Number(value.amount),
    type: value.type as TransactionType,
    isRecurring: value.isRecurring === true,
    frequency: value.frequency === "WEEKLY" ? "WEEKLY" : "MONTHLY",
    accountId: typeof value.accountId === "string" ? value.accountId : account?.id ?? null,
    currency: account?.currency ?? (value.currency === "USD" || value.currency === "EUR" ? value.currency : "ETB"),
    category: name,
    color: category.color ?? categoryColors[name] ?? categoryColors.Other,
    date: String(value.date),
    notes: typeof value.notes === "string" ? value.notes : null,
  };
}

function fromLocalTransaction(transaction: FinanceTransaction): FinanceTransaction {
  return {
    ...transaction,
    isRecurring: transaction.isRecurring === true,
    frequency: transaction.frequency === "WEEKLY" ? "WEEKLY" : "MONTHLY",
    accountId: transaction.accountId ?? demoAccounts[0].id,
    currency: transaction.currency ?? "ETB",
  };
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function updateLocalBudgetSpending(
  budgets: FinanceBudget[],
  transactions: FinanceTransaction[],
  convertAmount: (amount: number, from: CurrencyCode, to: CurrencyCode) => number | null,
) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  return budgets.map((budget) => {
    const expenses = transactions.filter((transaction) => {
      if (transaction.type !== "EXPENSE" || transaction.category !== budget.category) return false;
      const date = new Date(transaction.date);
      if (budget.period === "WEEKLY") return date >= weekStart && date <= now;
      if (budget.period === "YEARLY") return date.getFullYear() === now.getFullYear();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
    const convertedExpenses = expenses.map((transaction) => convertAmount(transaction.amount, transaction.currency, budget.currency ?? "ETB"));
    return {
      ...budget,
      spent: convertedExpenses.reduce<number>((sum, value) => sum + (value ?? 0), 0),
      conversionUnavailable: convertedExpenses.some((value) => value === null),
    };
  });
}

export async function loadTransactions(): Promise<FinanceTransaction[]> {
  if (databaseEnabled) {
    try {
      const response = await fetch("/api/transactions", { cache: "no-store" });
      if (!response.ok) throw new Error("Transactions API unavailable");
      const transactions = (await response.json() as Record<string, unknown>[]).map(fromApiTransaction);
      writeLocal(transactionKey, transactions);
      return transactions;
    } catch {
      return readLocal(transactionKey, demoTransactions).map(fromLocalTransaction);
    }
  }
  return readLocal(transactionKey, demoTransactions).map(fromLocalTransaction);
}

export async function saveTransaction(
  values: Omit<FinanceTransaction, "id" | "color"> & { id?: string },
): Promise<FinanceTransaction> {
  const payload = {
    ...(values.id ? { id: values.id } : {}),
    title: values.title,
    amount: values.amount,
    type: values.type,
    isRecurring: values.isRecurring,
    frequency: values.frequency,
    accountId: values.accountId,
    category: values.category,
    date: values.date,
    notes: values.notes ?? null,
  };
  let saved: FinanceTransaction;
  if (databaseEnabled) {
    try {
      const response = await fetch("/api/transactions", {
        method: values.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Transactions API unavailable");
      saved = fromApiTransaction(await response.json() as Record<string, unknown>);
    } catch {
      saved = { ...values, id: values.id ?? crypto.randomUUID(), color: categoryColors[values.category] ?? categoryColors.Other };
    }
  } else {
    saved = { ...values, id: values.id ?? crypto.randomUUID(), color: categoryColors[values.category] ?? categoryColors.Other };
  }
  const previous = readLocal(transactionKey, demoTransactions);
  const next = values.id ? previous.map((transaction) => transaction.id === values.id ? saved : transaction) : [saved, ...previous];
  writeLocal(transactionKey, next);
  return saved;
}

export async function loadAccounts(): Promise<FinanceAccount[]> {
  if (databaseEnabled) {
    try {
      const response = await fetch("/api/accounts", { cache: "no-store" });
      if (!response.ok) throw new Error("Accounts API unavailable");
      const accounts = await response.json() as FinanceAccount[];
      writeLocal(accountKey, accounts);
      return accounts;
    } catch {
      return readLocal(accountKey, demoAccounts);
    }
  }
  const accounts = readLocal(accountKey, demoAccounts);
  const transactions = readLocal(transactionKey, demoTransactions).map(fromLocalTransaction);
  const transfers = readLocal<Array<{ sourceAccountId: string; destinationAccountId: string; sourceAmount: number; destinationAmount: number }>>(transferKey, []);
  return accounts.map((account) => {
    const transactionBalance = transactions.filter((item) => item.accountId === account.id)
      .reduce((balance, item) => balance + (item.type === "INCOME" ? item.amount : -item.amount), 0);
    const transferBalance = transfers.reduce((balance, transfer) => balance
      + (transfer.destinationAccountId === account.id ? transfer.destinationAmount : 0)
      - (transfer.sourceAccountId === account.id ? transfer.sourceAmount : 0), 0);
    return { ...account, balance: account.openingBalance + transactionBalance + transferBalance };
  });
}

export async function saveAccount(values: { name: string; currency: CurrencyCode; openingBalance: number }): Promise<FinanceAccount> {
  if (databaseEnabled) {
    const response = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = await response.json().catch(() => null) as FinanceAccount & { error?: string } | null;
    if (!response.ok || !result) throw new Error(result?.error ?? "Could not create account.");
    writeLocal(accountKey, [...readLocal(accountKey, demoAccounts), result]);
    return result;
  }
  const account = { ...values, id: crypto.randomUUID(), balance: values.openingBalance };
  writeLocal(accountKey, [...readLocal(accountKey, demoAccounts), account]);
  return account;
}

export async function saveAccountTransfer(values: {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  destinationAmount: number;
  exchangeRate: number;
}): Promise<void> {
  if (databaseEnabled) {
    const response = await fetch("/api/accounts/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceAccountId: values.sourceAccountId, destinationAccountId: values.destinationAccountId, amount: values.amount }),
    });
    const result = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) throw new Error(result?.error ?? "Could not complete account transfer.");
    return;
  }
  const transfers = readLocal<Array<{ sourceAccountId: string; destinationAccountId: string; sourceAmount: number; destinationAmount: number; exchangeRate: number }>>(transferKey, []);
  writeLocal(transferKey, [...transfers, {
    sourceAccountId: values.sourceAccountId,
    destinationAccountId: values.destinationAccountId,
    sourceAmount: values.amount,
    destinationAmount: values.destinationAmount,
    exchangeRate: values.exchangeRate,
  }]);
}

export async function removeTransaction(id: string) {
  if (databaseEnabled) {
    try {
      await fetch(`/api/transactions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch {
      // Keep the local workspace available when the database is offline.
    }
  }
  writeLocal(transactionKey, readLocal(transactionKey, demoTransactions).filter((item) => item.id !== id));
}

export async function loadBudgets(
  transactions?: FinanceTransaction[],
  convertAmount: (amount: number, from: CurrencyCode, to: CurrencyCode) => number | null = (amount, from, to) => from === to ? amount : null,
): Promise<FinanceBudget[]> {
  const sourceTransactions = transactions ?? await loadTransactions();
  if (databaseEnabled) {
    try {
      const response = await fetch("/api/budgets", { cache: "no-store" });
      if (!response.ok) throw new Error("Budgets API unavailable");
      const budgets = await response.json() as Array<{ id: string; amount: number; currency: string; period: string; category: { name: string; color: string } }>;
      const thisMonth = new Date();
      const currentBudgets = budgets.filter((budget) => budget.period === "MONTHLY").map((budget) => {
        const budgetCurrency: CurrencyCode = budget.currency === "USD" || budget.currency === "EUR" ? budget.currency : "ETB";
        const currentBudget: FinanceBudget = {
          id: budget.id,
          category: budget.category.name,
          color: budget.category.color,
          amount: Number(budget.amount),
          currency: budgetCurrency,
          spent: 0,
          conversionUnavailable: false,
          period: budget.period,
        };
        const expenses = sourceTransactions.filter((transaction) => transaction.type === "EXPENSE" && transaction.category === budget.category.name && new Date(transaction.date).getMonth() === thisMonth.getMonth() && new Date(transaction.date).getFullYear() === thisMonth.getFullYear());
        const convertedExpenses = expenses.map((transaction) => convertAmount(transaction.amount, transaction.currency, budgetCurrency));
        currentBudget.spent = convertedExpenses.reduce<number>((sum, value) => sum + (value ?? 0), 0);
        currentBudget.conversionUnavailable = convertedExpenses.some((value) => value === null);
        return currentBudget;
      });
      writeLocal(budgetKey, currentBudgets);
      return currentBudgets;
    } catch {
      const localBudgets = updateLocalBudgetSpending(readLocal(budgetKey, demoBudgets), sourceTransactions, convertAmount);
      writeLocal(budgetKey, localBudgets);
      return localBudgets;
    }
  }
  const localBudgets = updateLocalBudgetSpending(readLocal(budgetKey, demoBudgets), sourceTransactions, convertAmount);
  writeLocal(budgetKey, localBudgets);
  return localBudgets;
}

export async function saveBudget(values: Omit<FinanceBudget, "id" | "spent" | "color">) {
  let saved: FinanceBudget;
  if (databaseEnabled) {
    try {
      const response = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error("Budgets API unavailable");
      const budget = await response.json() as { id: string; amount: number; currency: CurrencyCode; period: string; category: { name: string; color: string } };
      saved = { id: budget.id, amount: Number(budget.amount), currency: budget.currency, period: budget.period, category: budget.category.name, color: budget.category.color, spent: 0 };
    } catch {
      const existing = readLocal(budgetKey, demoBudgets).find((budget) => budget.category === values.category);
      saved = { ...values, id: existing?.id ?? crypto.randomUUID(), currency: values.currency ?? "ETB", color: categoryColors[values.category] ?? categoryColors.Other, spent: existing?.spent ?? 0 };
    }
  } else {
    const existing = readLocal(budgetKey, demoBudgets).find((budget) => budget.category === values.category);
    saved = { ...values, id: existing?.id ?? crypto.randomUUID(), currency: values.currency ?? "ETB", color: categoryColors[values.category] ?? categoryColors.Other, spent: existing?.spent ?? 0 };
  }
  const previous = readLocal(budgetKey, demoBudgets);
  writeLocal(budgetKey, [saved, ...previous.filter((budget) => budget.category !== saved.category)]);
}

export async function removeBudget(id: string) {
  try {
    await fetch(`/api/budgets?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch {
    // Keep the local workspace available when the database is offline.
  }
  writeLocal(budgetKey, readLocal(budgetKey, demoBudgets).filter((budget) => budget.id !== id));
}

export async function loadTasks(): Promise<FinanceTask[]> {
  if (databaseEnabled) {
    try {
      const response = await fetch("/api/tasks", { cache: "no-store" });
      if (!response.ok) throw new Error("Tasks API unavailable");
      const tasks = await response.json() as FinanceTask[];
      writeLocal(taskKey, tasks);
      return tasks;
    } catch {
      return readLocal(taskKey, demoTasks);
    }
  }
  return readLocal(taskKey, demoTasks);
}

export async function saveTask(values: Omit<FinanceTask, "id"> & { id?: string }): Promise<FinanceTask> {
  let saved: FinanceTask;
  if (databaseEnabled) {
    try {
      const response = await fetch("/api/tasks", {
        method: values.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error("Tasks API unavailable");
      saved = await response.json() as FinanceTask;
    } catch {
      saved = { ...values, id: values.id ?? crypto.randomUUID() };
    }
  } else {
    saved = { ...values, id: values.id ?? crypto.randomUUID() };
  }
  const previous = readLocal(taskKey, demoTasks);
  const next = values.id ? previous.map((task) => task.id === values.id ? saved : task) : [saved, ...previous];
  writeLocal(taskKey, next);
  return saved;
}

export async function removeTask(id: string) {
  if (databaseEnabled) {
    try {
      await fetch(`/api/tasks?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch {
      // Keep the local workspace available when the database is offline.
    }
  }
  writeLocal(taskKey, readLocal(taskKey, demoTasks).filter((task) => task.id !== id));
}

export function updateTaskStatus(task: FinanceTask, status: TaskStatus) {
  return saveTask({ ...task, status });
}