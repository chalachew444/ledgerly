export type TransactionType = "INCOME" | "EXPENSE";
export type TransactionFrequency = "WEEKLY" | "MONTHLY";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "COMPLETED";
export type CurrencyCode = "ETB" | "USD" | "EUR";
export type InvoiceStatus = "PAID" | "PENDING" | "OVERDUE";

export interface FinanceAccount {
  id: string;
  name: string;
  currency: CurrencyCode;
  openingBalance: number;
  balance: number;
}

export interface FinanceTransaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  isRecurring: boolean;
  frequency: TransactionFrequency;
  accountId: string | null;
  currency: CurrencyCode;
  category: string;
  color: string;
  date: string;
  notes?: string | null;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface FinanceClient {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
}

export interface FinanceInvoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  client: FinanceClient | null;
  lineItems: InvoiceLineItem[];
  totalAmount: number;
  currency: CurrencyCode;
  status: InvoiceStatus;
  dueDate: string;
  createdAt: string;
}

export interface FinanceInsights {
  totals: { thisMonth: number; lastMonth: number };
  categories: Array<{ name: string; color: string; current: number; previous: number; share: number; previousShare: number }>;
  weeks: Array<{ week: string; current: number; previous: number }>;
  insights: string[];
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
  currency?: CurrencyCode;
  conversionUnavailable?: boolean;
  period?: string;
}