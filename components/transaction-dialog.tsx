"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { transactionCategories } from "@/lib/demo-data";
import { loadAccounts } from "@/lib/client-store";
import type { FinanceAccount, FinanceTransaction, TransactionFrequency, TransactionType } from "@/lib/finance-types";

type TransactionValues = Omit<FinanceTransaction, "id" | "color"> & { id?: string };

export function TransactionDialog({
  open,
  onOpenChange,
  transaction,
  defaultDate,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: FinanceTransaction;
  defaultDate: string;
  onSave: (values: TransactionValues) => Promise<void>;
}) {
  const [title, setTitle] = useState(transaction?.title ?? "");
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [type, setType] = useState<TransactionType>(transaction?.type ?? "EXPENSE");
  const [category, setCategory] = useState(transaction?.category ?? "Food / Cafe");
  const [date, setDate] = useState(transaction?.date.slice(0, 10) ?? defaultDate);
  const [notes, setNotes] = useState(transaction?.notes ?? "");
  const [isRecurring, setIsRecurring] = useState(transaction?.isRecurring ?? false);
  const [frequency, setFrequency] = useState<TransactionFrequency>(transaction?.frequency ?? "MONTHLY");
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [accountId, setAccountId] = useState(transaction?.accountId ?? "");
  const [saving, setSaving] = useState(false);
  const selectedAccount = accounts.find((account) => account.id === accountId);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void loadAccounts().then((nextAccounts) => {
      if (!active) return;
      setAccounts(nextAccounts);
      setAccountId(transaction?.accountId && nextAccounts.some((account) => account.id === transaction.accountId)
        ? transaction.accountId
        : nextAccounts[0]?.id ?? "");
    });
    return () => { active = false; };
  }, [open, transaction?.accountId]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...(transaction ? { id: transaction.id } : {}),
        title: title.trim(),
        amount: Number(amount),
        type,
        category,
        accountId,
        currency: selectedAccount?.currency ?? "ETB",
        date: new Date(`${date}T12:00:00`).toISOString(),
        notes: notes.trim() || null,
        isRecurring,
        frequency,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{transaction ? "Edit transaction" : "Add transaction"}</DialogTitle>
          <DialogDescription>Keep the details clear. You can update this entry at any time.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-2 rounded-md bg-[#f0f1ec] p-1 dark:bg-[#26322b]">
            {(["EXPENSE", "INCOME"] as const).map((value) => <button key={value} type="button" onClick={() => setType(value)} className={`h-9 rounded text-sm font-medium transition-colors ${type === value ? "bg-white text-[#344b3b] shadow-sm dark:bg-[#3a4b40] dark:text-white" : "text-[#78827a]"}`}>{value === "EXPENSE" ? "Expense" : "Income"}</button>)}
          </div>
          <label className="block space-y-1.5 text-xs font-medium text-[#68736b] dark:text-[#b2bbb4]">Title<Input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What was it for?" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5 text-xs font-medium text-[#68736b] dark:text-[#b2bbb4]">Amount ({selectedAccount?.currency ?? "ETB"})<Input required min="0.01" step="0.01" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></label>
            <label className="block space-y-1.5 text-xs font-medium text-[#68736b] dark:text-[#b2bbb4]">Date<Input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          </div>
          <label className="block space-y-1.5 text-xs font-medium text-[#68736b] dark:text-[#b2bbb4]">Wallet<select required value={accountId} onChange={(event) => setAccountId(event.target.value)} className="h-10 w-full rounded-md border border-[#ddd9d2] bg-white px-3 text-sm text-[#28332d] outline-none focus:border-[#81998b] dark:border-[#35423d] dark:bg-[#19221e] dark:text-[#e7eae6]"><option value="" disabled>Select a wallet</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency}</option>)}</select>{accounts.length === 0 && <span className="block text-[11px] font-normal text-[#9a6a4c]">Add a wallet before creating transactions: <Link className="underline" href="/accounts">Manage wallets</Link></span>}</label>
          <label className="block space-y-1.5 text-xs font-medium text-[#68736b] dark:text-[#b2bbb4]">Category<select value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 w-full rounded-md border border-[#ddd9d2] bg-white px-3 text-sm text-[#28332d] outline-none focus:border-[#81998b] dark:border-[#35423d] dark:bg-[#19221e] dark:text-[#e7eae6]">{transactionCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <div className="space-y-3 rounded-md border border-[#e7e4dc] p-3 dark:border-[#35423d]">
            <label className="flex items-center gap-2 text-xs font-medium text-[#68736b] dark:text-[#b2bbb4]"><input type="checkbox" checked={isRecurring} onChange={(event) => setIsRecurring(event.target.checked)} className="size-4 accent-[#526d5b]" /> Recurring transaction</label>
            {isRecurring && <label className="block space-y-1.5 text-xs font-medium text-[#68736b] dark:text-[#b2bbb4]">Frequency<select value={frequency} onChange={(event) => setFrequency(event.target.value as TransactionFrequency)} className="h-10 w-full rounded-md border border-[#ddd9d2] bg-white px-3 text-sm text-[#28332d] outline-none focus:border-[#81998b] dark:border-[#35423d] dark:bg-[#19221e] dark:text-[#e7eae6]"><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option></select></label>}
          </div>
          <label className="block space-y-1.5 text-xs font-medium text-[#68736b] dark:text-[#b2bbb4]">Notes <span className="font-normal text-[#9aa198]">(optional)</span><textarea maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add context..." className="min-h-20.5 w-full resize-y rounded-md border border-[#ddd9d2] bg-white px-3 py-2 text-sm text-[#28332d] outline-none placeholder:text-[#929990] focus:border-[#81998b] dark:border-[#35423d] dark:bg-[#19221e] dark:text-[#e7eae6]" /></label>
          <div className="flex justify-end gap-2 pt-1"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={saving || !accountId}>{saving ? "Saving..." : transaction ? "Save changes" : "Add transaction"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}