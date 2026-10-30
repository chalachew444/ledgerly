"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, ArrowRightLeft, Landmark, Plus, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadAccounts, saveAccount, saveAccountTransfer } from "@/lib/client-store";
import type { CurrencyCode, FinanceAccount } from "@/lib/finance-types";
import { useCurrency } from "@/lib/currency-context";
import { formatCurrency } from "@/lib/utils";

export function AccountsPage() {
  const { currency, convertAmount, ratesUpdatedAt } = useCurrency();
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [name, setName] = useState("");
  const [accountCurrency, setAccountCurrency] = useState<CurrencyCode>(currency);
  const [openingBalance, setOpeningBalance] = useState("0");
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [destinationAccountId, setDestinationAccountId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const next = await loadAccounts();
    setAccounts(next);
    setSourceAccountId((current) => next.some((account) => account.id === current) ? current : next[0]?.id ?? "");
    setDestinationAccountId((current) => next.some((account) => account.id === current) ? current : next[1]?.id ?? "");
  }

  useEffect(() => {
    let active = true;
    void loadAccounts().then((next) => {
      if (!active) return;
      setAccounts(next);
      setSourceAccountId(next[0]?.id ?? "");
      setDestinationAccountId(next[1]?.id ?? "");
    });
    return () => { active = false; };
  }, []);

  const source = accounts.find((account) => account.id === sourceAccountId);
  const destination = accounts.find((account) => account.id === destinationAccountId);
  const requestedAmount = Number(transferAmount);
  const destinationAmount = source && destination && requestedAmount > 0
    ? convertAmount(requestedAmount, source.currency, destination.currency)
    : null;
  const totalBalance = useMemo(() => {
    let total = 0;
    for (const account of accounts) {
      const converted = convertAmount(account.balance, account.currency);
      if (converted === null) return null;
      total += converted;
    }
    return total;
  }, [accounts, convertAmount]);

  async function addAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await saveAccount({ name: name.trim(), currency: accountCurrency, openingBalance: Number(openingBalance) });
      setName("");
      setOpeningBalance("0");
      setNotice("Wallet added.");
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create wallet.");
    } finally {
      setSaving(false);
    }
  }

  async function transferFunds(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (!source || !destination || destinationAmount === null) throw new Error("A live exchange rate is needed for this transfer.");
      if (requestedAmount > source.balance) throw new Error("The source wallet does not have enough available funds.");
      await saveAccountTransfer({
        sourceAccountId: source.id,
        destinationAccountId: destination.id,
        amount: requestedAmount,
        destinationAmount,
        exchangeRate: destinationAmount / requestedAmount,
      });
      setTransferAmount("");
      setNotice(`Transferred ${formatCurrency(requestedAmount, source.currency)} into ${destination.name}.`);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not complete the transfer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#819087]">Money management</p><h1 className="text-[27px] font-semibold">Accounts & wallets</h1><p className="mt-2 text-sm text-[#7b857c] dark:text-[#aab4ac]">See balances across wallets and move money between them.</p></div>
        <div className="rounded-md border border-[#e7e4dc] bg-[#fffefa] px-4 py-3 dark:border-[#2d3932] dark:bg-[#19211d]"><p className="text-[10px] uppercase tracking-wide text-[#89938a]">Total wallet balance</p><p className="mt-1 text-lg font-semibold">{totalBalance === null ? "Rates unavailable" : formatCurrency(totalBalance, currency)}</p></div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {accounts.map((account) => {
          const value = convertAmount(account.balance, account.currency);
          return <article key={account.id} className="rounded-md border border-[#e7e4dc] bg-[#fffefa] p-4 dark:border-[#2d3932] dark:bg-[#19211d]">
            <div className="flex items-start justify-between"><span className="grid size-9 place-items-center rounded-md bg-[#e6eee5] text-[#53785a] dark:bg-[#293b30] dark:text-[#b2c9b2]"><WalletCards className="size-4.5" /></span><span className="text-[10px] font-semibold text-[#78827a]">{account.currency}</span></div>
            <h2 className="mt-4 text-sm font-semibold">{account.name}</h2><p className="mt-1 text-xl font-semibold">{formatCurrency(account.balance, account.currency)}</p>
            <p className="mt-1 text-[11px] text-[#89938a]">{value === null ? "Conversion quote unavailable" : `About ${formatCurrency(value, currency)}`}</p>
          </article>;
        })}
        {!accounts.length && <div className="rounded-md border border-dashed border-[#d6d8cf] p-6 text-sm text-[#89938a]">Add a wallet to start tracking balances.</div>}
      </section>

      {ratesUpdatedAt && <p className="text-[11px] text-[#89938a]">Exchange quotes updated {new Date(ratesUpdatedAt).toLocaleString()}.</p>}

      <section className="grid gap-4 xl:grid-cols-2">
        <form onSubmit={addAccount} className="space-y-4 rounded-md border border-[#e7e4dc] bg-[#fffefa] p-5 dark:border-[#2d3932] dark:bg-[#19211d]">
          <div className="flex items-center gap-2"><Landmark className="size-4 text-[#718078]" /><div><h2 className="text-sm font-semibold">Add a wallet</h2><p className="mt-1 text-xs text-[#89938a]">Cash, mobile money, bank, or savings.</p></div></div>
          <label className="block space-y-1.5 text-xs font-medium text-[#68736b] dark:text-[#b2bbb4]">Wallet name<Input required maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. CBE Bank" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5 text-xs font-medium text-[#68736b] dark:text-[#b2bbb4]">Currency<select value={accountCurrency} onChange={(event) => setAccountCurrency(event.target.value as CurrencyCode)} className="h-10 w-full rounded-md border border-[#ddd9d2] bg-white px-3 text-sm dark:border-[#35423d] dark:bg-[#19221e]"><option value="ETB">ETB</option><option value="USD">USD</option><option value="EUR">EUR</option></select></label>
            <label className="block space-y-1.5 text-xs font-medium text-[#68736b] dark:text-[#b2bbb4]">Opening balance<Input required type="number" step="0.01" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} /></label>
          </div>
          <Button type="submit" disabled={saving}><Plus className="size-4" /> Add wallet</Button>
        </form>

        <form onSubmit={transferFunds} className="space-y-4 rounded-md border border-[#e7e4dc] bg-[#fffefa] p-5 dark:border-[#2d3932] dark:bg-[#19211d]">
          <div className="flex items-center gap-2"><ArrowRightLeft className="size-4 text-[#718078]" /><div><h2 className="text-sm font-semibold">Transfer between wallets</h2><p className="mt-1 text-xs text-[#89938a]">Transfers use the latest available currency quote.</p></div></div>
          <label className="block space-y-1.5 text-xs font-medium text-[#68736b] dark:text-[#b2bbb4]">From<select required value={sourceAccountId} onChange={(event) => setSourceAccountId(event.target.value)} className="h-10 w-full rounded-md border border-[#ddd9d2] bg-white px-3 text-sm dark:border-[#35423d] dark:bg-[#19221e]">{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {formatCurrency(account.balance, account.currency)}</option>)}</select></label>
          <label className="block space-y-1.5 text-xs font-medium text-[#68736b] dark:text-[#b2bbb4]">To<select required value={destinationAccountId} onChange={(event) => setDestinationAccountId(event.target.value)} className="h-10 w-full rounded-md border border-[#ddd9d2] bg-white px-3 text-sm dark:border-[#35423d] dark:bg-[#19221e]"><option value="">Select destination</option>{accounts.filter((account) => account.id !== sourceAccountId).map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency}</option>)}</select></label>
          <label className="block space-y-1.5 text-xs font-medium text-[#68736b] dark:text-[#b2bbb4]">Amount ({source?.currency ?? currency})<Input required min="0.01" step="0.01" type="number" value={transferAmount} onChange={(event) => setTransferAmount(event.target.value)} /></label>
          {source && destination && destinationAmount !== null && <p className="flex items-center gap-1 text-xs text-[#718078]"><ArrowDownUp className="size-3.5" /> Recipient receives {formatCurrency(destinationAmount, destination.currency)}</p>}
          {source && destination && destinationAmount === null && source.currency !== destination.currency && <p className="text-xs text-[#a45e40]">Waiting for live currency rates.</p>}
          <Button type="submit" disabled={saving || accounts.length < 2 || destinationAmount === null}>Transfer funds</Button>
          {accounts.length < 2 && <p className="text-xs text-[#89938a]">Add a second wallet to make a transfer. <Link href="/transactions" className="underline">View transactions</Link></p>}
        </form>
      </section>
      {error && <p role="alert" className="rounded-md border border-[#efd2c5] bg-[#fff4ee] px-4 py-3 text-sm text-[#9b5638]">{error}</p>}
      {notice && <p role="status" className="text-sm text-[#55785b]">{notice}</p>}
    </div>
  );
}
