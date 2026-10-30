import type { FinanceAccount, FinanceBudget, FinanceTask, FinanceTransaction } from "@/lib/finance-types";

const demoDate = new Date("2026-10-28T12:00:00.000Z");
const day = (offset: number) => {
  const date = new Date(demoDate);
  date.setDate(demoDate.getDate() + offset);
  return date.toISOString();
};

export const demoTransactions: FinanceTransaction[] = [
  { id: "demo-1", title: "Monthly salary", amount: 28500, type: "INCOME", isRecurring: false, frequency: "MONTHLY", accountId: "demo-cash", currency: "ETB", category: "Salary", color: "#70946d", date: day(-1), notes: "October payroll" },
  { id: "demo-2", title: "Cafe & lunch", amount: 245, type: "EXPENSE", isRecurring: false, frequency: "MONTHLY", accountId: "demo-cash", currency: "ETB", category: "Food / Cafe", color: "#d3784d", date: day(-1), notes: "Lunch with the team" },
  { id: "demo-3", title: "Apartment rent", amount: 8200, type: "EXPENSE", isRecurring: false, frequency: "MONTHLY", accountId: "demo-cash", currency: "ETB", category: "Rent", color: "#92775c", date: day(-3) },
  { id: "demo-4", title: "Client project", amount: 6500, type: "INCOME", isRecurring: false, frequency: "MONTHLY", accountId: "demo-cash", currency: "ETB", category: "Business", color: "#7c8460", date: day(-5), notes: "Brand identity milestone" },
  { id: "demo-5", title: "Ride share", amount: 180, type: "EXPENSE", isRecurring: false, frequency: "MONTHLY", accountId: "demo-cash", currency: "ETB", category: "Transport", color: "#568a86", date: day(-6) },
  { id: "demo-6", title: "Market groceries", amount: 1320, type: "EXPENSE", isRecurring: false, frequency: "MONTHLY", accountId: "demo-cash", currency: "ETB", category: "Food / Cafe", color: "#d3784d", date: day(-9) },
  { id: "demo-7", title: "Electricity bill", amount: 760, type: "EXPENSE", isRecurring: false, frequency: "MONTHLY", accountId: "demo-cash", currency: "ETB", category: "Utilities", color: "#788caa", date: day(-12) },
  { id: "demo-8", title: "Online course", amount: 950, type: "EXPENSE", isRecurring: false, frequency: "MONTHLY", accountId: "demo-cash", currency: "ETB", category: "Education", color: "#8b806e", date: day(-17) },
  { id: "demo-9", title: "Consulting retainer", amount: 8400, type: "INCOME", isRecurring: false, frequency: "MONTHLY", accountId: "demo-cash", currency: "ETB", category: "Business", color: "#7c8460", date: day(-24) },
  { id: "demo-10", title: "Transport pass", amount: 540, type: "EXPENSE", isRecurring: false, frequency: "MONTHLY", accountId: "demo-cash", currency: "ETB", category: "Transport", color: "#568a86", date: day(-31) },
];

export const demoBudgets: FinanceBudget[] = [
  { id: "budget-cafe", category: "Food / Cafe", color: "#d3784d", amount: 2000, spent: 1565, currency: "ETB", period: "MONTHLY" },
  { id: "budget-transport", category: "Transport", color: "#568a86", amount: 1800, spent: 720, currency: "ETB", period: "MONTHLY" },
  { id: "budget-utilities", category: "Utilities", color: "#788caa", amount: 1200, spent: 760, currency: "ETB", period: "MONTHLY" },
];

export const demoAccounts: FinanceAccount[] = [
  { id: "demo-cash", name: "Cash", currency: "ETB", openingBalance: 4500, balance: 4500 },
  { id: "demo-telebirr", name: "Telebirr", currency: "ETB", openingBalance: 2100, balance: 2100 },
  { id: "demo-cbe", name: "CBE Bank", currency: "ETB", openingBalance: 18000, balance: 18000 },
];

export const demoTasks: FinanceTask[] = [
  { id: "task-1", title: "Review monthly cash flow", description: "Reconcile personal and business accounts.", status: "TODO", dueDate: day(2) },
  { id: "task-2", title: "Send invoice to Abay Studio", description: "Invoice for the October design milestone.", status: "IN_PROGRESS", dueDate: day(1) },
  { id: "task-3", title: "Set cafe spending limit", status: "COMPLETED" },
];

export const categoryColors: Record<string, string> = {
  "Food / Cafe": "#d3784d",
  Transport: "#568a86",
  Rent: "#92775c",
  Salary: "#70946d",
  Business: "#7c8460",
  Utilities: "#788caa",
  Shopping: "#bc785e",
  Education: "#8b806e",
  Health: "#a47f91",
  Other: "#8b806e",
};

export const transactionCategories = [
  "Food / Cafe",
  "Transport",
  "Rent",
  "Salary",
  "Business",
  "Utilities",
  "Shopping",
  "Education",
  "Health",
  "Other",
];