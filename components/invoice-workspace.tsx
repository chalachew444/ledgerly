"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Plus, Printer, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadInvoices, saveInvoice, setInvoiceStatus } from "@/lib/invoice-store";
import type { CurrencyCode, FinanceClient, FinanceInvoice, InvoiceLineItem, InvoiceStatus } from "@/lib/finance-types";
import { useCurrency } from "@/lib/currency-context";
import { formatCurrency } from "@/lib/utils";

type StatusFilter = "ALL" | InvoiceStatus;

function invoiceStatus(invoice: FinanceInvoice): InvoiceStatus {
  if (invoice.status === "PAID") return "PAID";
  return invoice.dueDate.slice(0, 10) < new Date().toISOString().slice(0, 10) ? "OVERDUE" : "PENDING";
}

function formatDueDate(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString();
}

export function InvoiceWorkspace() {
  const { currency: preferredCurrency } = useCurrency();
  const [currency, setCurrency] = useState<CurrencyCode>(preferredCurrency);
  const [invoices, setInvoices] = useState<FinanceInvoice[]>([]);
  const [clients, setClients] = useState<FinanceClient[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([{ description: "", quantity: 1, unitPrice: 0 }]);
  const [printingId, setPrintingId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void loadInvoices().then((data) => {
      if (!active) return;
      setInvoices(data.invoices);
      setClients(data.clients);
      const today = new Date();
      setDueDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14).toISOString().slice(0, 10));
      setInvoiceNumber(`INV-${today.getFullYear()}-${String(today.getTime()).slice(-6)}`);
    });
    return () => { active = false; };
  }, []);

  const visibleInvoices = useMemo(() => invoices.filter((invoice) => filter === "ALL" || invoiceStatus(invoice) === filter), [invoices, filter]);
  const invoiceTotal = lineItems.reduce((sum, item) => sum + Math.max(0, item.quantity) * Math.max(0, item.unitPrice), 0);

  function chooseClient(value: string) {
    setClientId(value);
    const client = clients.find((item) => item.id === value);
    setClientName(client?.name ?? "");
    setClientEmail(client?.email ?? "");
    setClientCompany(client?.company ?? "");
  }

  function updateLineItem(index: number, patch: Partial<InvoiceLineItem>) {
    setLineItems((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  async function createInvoice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const invoice = await saveInvoice({
        invoiceNumber: invoiceNumber.trim(),
        ...(clientId ? { clientId } : {}),
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        clientCompany: clientCompany.trim(),
        lineItems,
        currency,
        dueDate,
      });
      setInvoices((items) => [invoice, ...items]);
      if (invoice.client && !clients.some((client) => client.id === invoice.client?.id)) setClients((items) => [...items, invoice.client!]);
      setInvoiceNumber(`INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`);
      setLineItems([{ description: "", quantity: 1, unitPrice: 0 }]);
      setClientId("");
      setClientName("");
      setClientEmail("");
      setClientCompany("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create invoice.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePaid(invoice: FinanceInvoice) {
    setError("");
    try {
      const status = invoiceStatus(invoice) === "PAID" ? "PENDING" : "PAID";
      await setInvoiceStatus(invoice.id, status);
      setInvoices((items) => items.map((item) => item.id === invoice.id ? { ...item, status } : item));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update invoice.");
    }
  }

  function printInvoice(invoice: FinanceInvoice) {
    setPrintingId(invoice.id);
    window.setTimeout(() => window.print(), 50);
  }

  return (
    <div className="space-y-7">
      <header className="no-print flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#819087]">Business workspace</p><h1 className="text-[27px] font-semibold">Clients & invoices</h1><p className="mt-2 text-sm text-[#7b857c] dark:text-[#aab4ac]">Build client-ready invoices, track payment status, and print or save as PDF.</p></div>
        <div className="flex items-center gap-2 rounded-md border border-[#e7e4dc] bg-[#fffefa] px-3 py-2 text-xs dark:border-[#2d3932] dark:bg-[#19211d]"><ReceiptText className="size-4 text-[#718078]" />{clients.length} clients · {invoices.length} invoices</div>
      </header>

      <div className="no-print grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
        <form onSubmit={createInvoice} className="space-y-4 rounded-md border border-[#e7e4dc] bg-[#fffefa] p-4 dark:border-[#2d3932] dark:bg-[#19211d] sm:p-5">
          <div className="flex items-center gap-2"><FileText className="size-4 text-[#718078]" /><div><h2 className="text-sm font-semibold">Create an invoice</h2><p className="mt-1 text-xs text-[#89938a]">Line-item totals are calculated automatically.</p></div></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5 text-xs font-medium text-[#68736b] dark:text-[#b2bbb4]">Invoice number<Input required maxLength={40} value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} /></label>
            <label className="block space-y-1.5 text-xs font-medium text-[#68736b] dark:text-[#b2bbb4]">Due date<Input required type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
          </div>
          <label className="block space-y-1.5 text-xs font-medium text-[#68736b] dark:text-[#b2bbb4]">Client<select value={clientId} onChange={(event) => chooseClient(event.target.value)} className="h-10 w-full rounded-md border border-[#ddd9d2] bg-white px-3 text-sm dark:border-[#35423d] dark:bg-[#19221e]"><option value="">Add a new client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}{client.company ? ` · ${client.company}` : ""}</option>)}</select></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5 text-xs font-medium text-[#68736b] dark:text-[#b2bbb4]">Client name<Input required maxLength={120} value={clientName} onChange={(event) => { setClientName(event.target.value); setClientId(""); }} /></label>
            <label className="block space-y-1.5 text-xs font-medium text-[#68736b] dark:text-[#b2bbb4]">Client email<Input type="email" maxLength={254} value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} /></label>
          </div>
          {!clientId && <label className="block space-y-1.5 text-xs font-medium text-[#68736b] dark:text-[#b2bbb4]">Company <span className="font-normal text-[#9aa198]">(optional)</span><Input maxLength={120} value={clientCompany} onChange={(event) => setClientCompany(event.target.value)} /></label>}
          <div className="space-y-2">
            <div className="flex items-center justify-between"><h3 className="text-xs font-semibold">Line items</h3><select aria-label="Invoice currency" value={currency} onChange={(event) => setCurrency(event.target.value as CurrencyCode)} className="h-8 rounded border border-[#ddd9d2] bg-white px-2 text-xs dark:border-[#35423d] dark:bg-[#19221e]"><option value="ETB">ETB</option><option value="USD">USD</option><option value="EUR">EUR</option></select></div>
            {lineItems.map((item, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_70px_100px_32px] gap-2">
              <Input required aria-label="Description" placeholder="Service or product" maxLength={160} value={item.description} onChange={(event) => updateLineItem(index, { description: event.target.value })} />
              <Input required aria-label="Quantity" type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => updateLineItem(index, { quantity: Number(event.target.value) })} />
              <Input required aria-label="Unit price" type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => updateLineItem(index, { unitPrice: Number(event.target.value) })} />
              <button type="button" aria-label="Remove line item" disabled={lineItems.length === 1} onClick={() => setLineItems((items) => items.filter((_, itemIndex) => itemIndex !== index))} className="rounded border border-[#e7e4dc] text-lg text-[#89938a] disabled:opacity-30">×</button>
            </div>)}
            <Button type="button" variant="outline" onClick={() => setLineItems((items) => [...items, { description: "", quantity: 1, unitPrice: 0 }])}><Plus className="size-3.5" /> Add line item</Button>
          </div>
          <div className="flex items-center justify-between border-t border-[#eeece6] pt-3 dark:border-[#2d3932]"><span className="text-xs text-[#89938a]">Invoice total</span><strong className="text-lg">{formatCurrency(invoiceTotal, currency)}</strong></div>
          <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create invoice"}</Button>
        </form>

        <section className="rounded-md border border-[#e7e4dc] bg-[#fffefa] p-4 dark:border-[#2d3932] dark:bg-[#19211d] sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">Invoice register</h2><p className="mt-1 text-xs text-[#89938a]">{visibleInvoices.length} matching invoices</p></div><select aria-label="Filter invoices by status" value={filter} onChange={(event) => setFilter(event.target.value as StatusFilter)} className="h-9 rounded-md border border-[#ddd9d2] bg-white px-2 text-xs dark:border-[#35423d] dark:bg-[#19221e]"><option value="ALL">All statuses</option><option value="PENDING">Pending</option><option value="OVERDUE">Overdue</option><option value="PAID">Paid</option></select></div>
          <div className="space-y-3">
            {visibleInvoices.map((invoice) => {
              const status = invoiceStatus(invoice);
              const tones = { PAID: "bg-[#e6eee5] text-[#53785a]", PENDING: "bg-[#f3eddc] text-[#a07830]", OVERDUE: "bg-[#f5e9e2] text-[#b05d3e]" };
              return <article key={invoice.id} className="rounded-md border border-[#eeece6] p-3 dark:border-[#2d3932]">
                <div className="flex items-start justify-between gap-2"><div><p className="text-xs font-semibold">{invoice.invoiceNumber}</p><p className="mt-1 text-xs text-[#68736b] dark:text-[#b2bbb4]">{invoice.clientName}</p></div><span className={`rounded px-2 py-1 text-[10px] font-semibold ${tones[status]}`}>{status}</span></div>
                <div className="mt-3 flex items-end justify-between gap-2"><div><p className="text-sm font-semibold">{formatCurrency(invoice.totalAmount, invoice.currency)}</p><p className="mt-1 text-[10px] text-[#89938a]">Due {formatDueDate(invoice.dueDate)}</p></div><div className="flex gap-1"><button type="button" onClick={() => void togglePaid(invoice)} className="rounded px-2 py-1.5 text-[10px] font-medium text-[#526d5b] hover:bg-[#f1f0eb] dark:text-[#b0c5b3] dark:hover:bg-[#29352f]">{status === "PAID" ? "Reopen" : "Mark paid"}</button><button type="button" onClick={() => printInvoice(invoice)} aria-label={`Print ${invoice.invoiceNumber}`} className="grid size-8 place-items-center rounded text-[#718078] hover:bg-[#f1f0eb] dark:hover:bg-[#29352f]"><Printer className="size-4" /></button></div></div>
              </article>;
            })}
            {!visibleInvoices.length && <p className="py-8 text-center text-xs text-[#89938a]">No invoices match this filter.</p>}
          </div>
        </section>
      </div>
      {error && <p role="alert" className="no-print rounded-md border border-[#efd2c5] bg-[#fff4ee] px-4 py-3 text-sm text-[#9b5638]">{error}</p>}

      {invoices.map((invoice) => <article key={`print-${invoice.id}`} className={`print-document ${printingId === invoice.id ? "is-active" : ""}`}>
        <header className="flex items-start justify-between border-b border-gray-300 pb-6"><div><p className="text-sm font-semibold uppercase tracking-widest text-gray-500">Ledgerly</p><h1 className="mt-3 text-3xl font-semibold">INVOICE</h1><p className="mt-2 text-sm">{invoice.invoiceNumber}</p></div><div className="text-right text-sm"><p className="font-semibold">{invoice.clientName}</p>{invoice.client?.company && <p>{invoice.client.company}</p>}{invoice.client?.email && <p>{invoice.client.email}</p>}<p className="mt-3">Due {formatDueDate(invoice.dueDate)}</p></div></header>
        <table className="mt-8 w-full text-left text-sm"><thead><tr className="border-b border-gray-300"><th className="py-3">Description</th><th className="py-3 text-right">Qty</th><th className="py-3 text-right">Unit price</th><th className="py-3 text-right">Amount</th></tr></thead><tbody>{invoice.lineItems.map((item, index) => <tr key={index} className="border-b border-gray-200"><td className="py-3">{item.description}</td><td className="py-3 text-right">{item.quantity}</td><td className="py-3 text-right">{formatCurrency(item.unitPrice, invoice.currency)}</td><td className="py-3 text-right">{formatCurrency(item.quantity * item.unitPrice, invoice.currency)}</td></tr>)}</tbody></table>
        <p className="mt-6 text-right text-xl font-semibold">Total due: {formatCurrency(invoice.totalAmount, invoice.currency)}</p><p className="mt-10 text-xs text-gray-500">Thank you for your business.</p>
      </article>)}
    </div>
  );
}
