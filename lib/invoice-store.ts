import type { FinanceClient, FinanceInvoice, InvoiceLineItem, InvoiceStatus, CurrencyCode } from "@/lib/finance-types";

const invoiceStorageKey = "ledgerly-invoices-v1";
const clientStorageKey = "ledgerly-clients-v1";
const databaseEnabled = process.env.NEXT_PUBLIC_DATABASE_ENABLED === "true";

export async function loadInvoices(): Promise<{ invoices: FinanceInvoice[]; clients: FinanceClient[] }> {
  if (databaseEnabled) {
    try {
      const response = await fetch("/api/invoices", { cache: "no-store" });
      if (!response.ok) throw new Error("Invoice API unavailable");
      const data = await response.json() as { invoices: FinanceInvoice[]; clients: FinanceClient[] };
      localStorage.setItem(invoiceStorageKey, JSON.stringify(data.invoices));
      localStorage.setItem(clientStorageKey, JSON.stringify(data.clients));
      return data;
    } catch {
      // Allow the local demo workspace to remain available while the API is offline.
    }
  }
  return {
    invoices: JSON.parse(localStorage.getItem(invoiceStorageKey) ?? "[]") as FinanceInvoice[],
    clients: JSON.parse(localStorage.getItem(clientStorageKey) ?? "[]") as FinanceClient[],
  };
}

export async function saveInvoice(values: {
  invoiceNumber: string;
  clientId?: string;
  clientName: string;
  clientEmail: string;
  clientCompany: string;
  lineItems: InvoiceLineItem[];
  currency: CurrencyCode;
  dueDate: string;
}): Promise<FinanceInvoice> {
  if (databaseEnabled) {
    const response = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(result?.error ?? "Could not create invoice.");
    }
    return await response.json() as FinanceInvoice;
  }
  const invoiceId = crypto.randomUUID();
  const clients = JSON.parse(localStorage.getItem(clientStorageKey) ?? "[]") as FinanceClient[];
  const existingClient = values.clientId ? clients.find((client) => client.id === values.clientId) : undefined;
  const client: FinanceClient = existingClient ?? {
    id: crypto.randomUUID(),
    name: values.clientName,
    email: values.clientEmail || null,
    company: values.clientCompany || null,
  };
  if (!existingClient) localStorage.setItem(clientStorageKey, JSON.stringify([...clients, client]));
  const invoice: FinanceInvoice = {
    id: invoiceId,
    invoiceNumber: values.invoiceNumber,
    clientName: values.clientName,
    client,
    lineItems: values.lineItems,
    totalAmount: values.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    currency: values.currency,
    status: "PENDING",
    dueDate: new Date(values.dueDate).toISOString(),
    createdAt: new Date().toISOString(),
  };
  const invoices = JSON.parse(localStorage.getItem(invoiceStorageKey) ?? "[]") as FinanceInvoice[];
  localStorage.setItem(invoiceStorageKey, JSON.stringify([invoice, ...invoices]));
  return invoice;
}

export async function setInvoiceStatus(id: string, status: InvoiceStatus) {
  if (databaseEnabled) {
    const response = await fetch("/api/invoices", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!response.ok) throw new Error("Could not update invoice status.");
  }
  const invoices = JSON.parse(localStorage.getItem(invoiceStorageKey) ?? "[]") as FinanceInvoice[];
  localStorage.setItem(invoiceStorageKey, JSON.stringify(invoices.map((invoice) => invoice.id === id ? { ...invoice, status } : invoice)));
}
