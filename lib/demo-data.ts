import type { FinanceBudget, FinanceTask, FinanceTransaction } from "@/lib/finance-types";

const today = new Date();
const day = (offset: number) => {
  const date = new Date(today);
  date.setDate(today.getDate() + offset);
  return date.toISOString();
};

export const demoTransactions: FinanceTransaction[] = [
  { id: "demo-1", title: "Monthly salary", amount: 28500, type: "INCOME", category: "Salary", color: "#70946d", date: day(-1), notes: "October payroll" },
  { id: "demo-2", title: "Cafe & lunch", amount: 245, type: "EXPENSE", category: "Food / Cafe", color: "#d3784d", date: day(-1), notes: "Lunch with the team" },
  { id: "demo-3", title: "Apartment rent", amount: 8200, type: "EXPENSE", category: "Rent", color: "#92775c", date: day(-3) },
  { id: "demo-4", title: "Client project", amount: 6500, type: "INCOME", category: "Business", color: "#7c8460", date: day(-5), notes: "Brand identity milestone" },
  { id: "demo-5", title: "Ride share", amount: 180, type: "EXPENSE", category: "Transport", color: "#568a86", date: day(-6) },
  { id: "demo-6", title: "Market groceries", amount: 1320, type: "EXPENSE", category: "Food / Cafe", color: "#d3784d", date: day(-9) },
  { id: "demo-7", title: "Electricity bill", amount: 760, type: "EXPENSE", category: "Utilities", color: "#788caa", date: day(-12) },
  { id: "demo-8", title: "Online course", amount: 950, type: "EXPENSE", category: "Education", color: "#8b806e", date: day(-17) },
  { id: "demo-9", title: "Consulting retainer", amount: 8400, type: "INCOME", category: "Business", color: "#7c8460", date: day(-24) },
  { id: "demo-10", title: "Transport pass", amount: 540, type: "EXPENSE", category: "Transport", color: "#568a86", date: day(-31) },
];

export const demoBudgets: FinanceBudget[] = [
  { id: "budget-cafe", category: "Food / Cafe", color: "#d3784d", amount: 2000, spent: 1565, period: "MONTHLY" },
  { id: "budget-transport", category: "Transport", color: "#568a86", amount: 1800, spent: 720, period: "MONTHLY" },
  { id: "budget-utilities", category: "Utilities", color: "#788caa", amount: 1200, spent: 760, period: "MONTHLY" },
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