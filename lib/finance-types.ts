export type TransactionType = "INCOME" | "EXPENSE";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "COMPLETED";

export interface FinanceTransaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  color: string;
  date: string;
  notes?: string | null;
}

export interface FinanceTask {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  dueDate?: string | null;
}

export interface FinanceBudget {
  id: string;
  category: string;
  color: string;
  amount: number;
  spent: number;
  period?: string;
}