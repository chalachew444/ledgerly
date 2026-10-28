import { categoryColors, demoBudgets, demoTasks, demoTransactions } from "@/lib/demo-data";
import type { FinanceBudget, FinanceTask, FinanceTransaction, TaskStatus, TransactionType } from "@/lib/finance-types";

const transactionKey = "ledgerly-transactions-v1";
const budgetKey = "ledgerly-budgets-v1";
const taskKey = "ledgerly-tasks-v1";
const databaseEnabled = process.env.NEXT_PUBLIC_DATABASE_ENABLED === "true";

function fromApiTransaction(value: Record<string, unknown>): FinanceTransaction {
  const category = typeof value.category === "object" && value.category !== null
    ? value.category as { name?: string; color?: string }
    : { name: String(value.category ?? "Other"), color: undefined };
  const name = category.name ?? "Other";
  return {
    id: String(value.id),
    title: String(value.title),
    amount: Number(value.amount),
    type: value.type as TransactionType,
    category: name,
    color: category.color ?? categoryColors[name] ?? categoryColors.Other,
    date: String(value.date),
    notes: typeof value.notes === "string" ? value.notes : null,
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

function updateLocalBudgetSpending(budgets: FinanceBudget[], transactions: FinanceTransaction[]) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  return budgets.map((budget) => ({
    ...budget,
    spent: transactions.filter((transaction) => {
      if (transaction.type !== "EXPENSE" || transaction.category !== budget.category) return false;
      const date = new Date(transaction.date);
      if (budget.period === "WEEKLY") return date >= weekStart && date <= now;
      if (budget.period === "YEARLY") return date.getFullYear() === now.getFullYear();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).reduce((sum, transaction) => sum + transaction.amount, 0),
  }));
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
      return readLocal(transactionKey, demoTransactions);
    }
  }
  return readLocal(transactionKey, demoTransactions);
}

export async function saveTransaction(
  values: Omit<FinanceTransaction, "id" | "color"> & { id?: string },
): Promise<FinanceTransaction> {
  const payload = {
    ...(values.id ? { id: values.id } : {}),
    title: values.title,
    amount: values.amount,
    type: values.type,
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

export async function loadBudgets(transactions?: FinanceTransaction[]): Promise<FinanceBudget[]> {
  const sourceTransactions = transactions ?? await loadTransactions();
  if (databaseEnabled) {
    try {
      const response = await fetch("/api/budgets", { cache: "no-store" });
      if (!response.ok) throw new Error("Budgets API unavailable");
      const budgets = await response.json() as Array<{ id: string; amount: number; period: string; category: { name: string; color: string } }>;
      const thisMonth = new Date();
      const currentBudgets = budgets.filter((budget) => budget.period === "MONTHLY").map((budget) => ({
        id: budget.id,
        category: budget.category.name,
        color: budget.category.color,
        amount: Number(budget.amount),
        spent: sourceTransactions.filter((transaction) => transaction.type === "EXPENSE" && transaction.category === budget.category.name && new Date(transaction.date).getMonth() === thisMonth.getMonth() && new Date(transaction.date).getFullYear() === thisMonth.getFullYear()).reduce((sum, transaction) => sum + transaction.amount, 0),
        period: budget.period,
      }));
      writeLocal(budgetKey, currentBudgets);
      return currentBudgets;
    } catch {
      const localBudgets = updateLocalBudgetSpending(readLocal(budgetKey, demoBudgets), sourceTransactions);
      writeLocal(budgetKey, localBudgets);
      return localBudgets;
    }
  }
  const localBudgets = updateLocalBudgetSpending(readLocal(budgetKey, demoBudgets), sourceTransactions);
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
      const budget = await response.json() as { id: string; amount: number; period: string; category: { name: string; color: string } };
      saved = { id: budget.id, amount: Number(budget.amount), period: budget.period, category: budget.category.name, color: budget.category.color, spent: 0 };
    } catch {
      const existing = readLocal(budgetKey, demoBudgets).find((budget) => budget.category === values.category);
      saved = { ...values, id: existing?.id ?? crypto.randomUUID(), color: categoryColors[values.category] ?? categoryColors.Other, spent: existing?.spent ?? 0 };
    }
  } else {
    const existing = readLocal(budgetKey, demoBudgets).find((budget) => budget.category === values.category);
    saved = { ...values, id: existing?.id ?? crypto.randomUUID(), color: categoryColors[values.category] ?? categoryColors.Other, spent: existing?.spent ?? 0 };
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