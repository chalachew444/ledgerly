"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ArrowDownUp, CircleHelp, LayoutDashboard, ListTodo, LogOut, Settings2, WalletCards } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCurrency } from "@/lib/currency-context";

const navigation = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowDownUp },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { currency, setCurrency } = useCurrency();
  if (pathname === "/login" || pathname === "/register") return <>{children}</>;
  const displayName = session?.user?.name || session?.user?.email || "Account";
  const initials = displayName.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U";
  return (
    <div className="min-h-screen bg-[#f7f6f2] text-[#26352e] transition-colors dark:bg-[#131a17] dark:text-[#e8ece8]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-62 flex-col border-r border-[#e7e4dc] bg-[#fbfaf7] px-5 py-6 dark:border-[#2d3932] dark:bg-[#19211d] lg:flex">
        <Link href="/" className="mb-10 flex items-center gap-3 px-1">
          <div className="grid size-10 place-items-center rounded-lg bg-[#dbe5d8] text-[#365a46] dark:bg-[#2f4337] dark:text-[#bbd0bd]">
            <WalletCards className="size-5" />
          </div>
          <div>
            <p className="font-semibold tracking-[-0.01em]">Ledgerly</p>
            <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-[#8a938b]">Money, in perspective</p>
          </div>
        </Link>
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9aa198]">Workspace</p>
        <nav className="space-y-1">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link key={href} href={href} className={cn("flex h-10 items-center gap-3 rounded-md px-3 text-[13px] font-medium transition-colors", active ? "bg-[#e9eee7] text-[#315541] dark:bg-[#2a3a31] dark:text-[#d0e0d1]" : "text-[#69746c] hover:bg-[#f1f0eb] hover:text-[#26352e] dark:text-[#aeb9b1] dark:hover:bg-[#25312a] dark:hover:text-white")}>
                <Icon className="size-4.25" strokeWidth={1.8} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-[#e7e4dc] pt-4 dark:border-[#2d3932]">
          <div className="mb-4 rounded-md bg-[#f1f1eb] p-3 dark:bg-[#232d27]">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#7b857c]">Current workspace</span>
              <Settings2 className="size-3.5 text-[#8c968d]" />
            </div>
            <p className="text-sm font-medium">Personal & business</p>
            <p className="mt-1 text-xs text-[#8b948b]">All accounts · ETB</p>
          </div>
          <div className="flex items-center gap-3 rounded-md px-3 py-2 text-xs text-[#7b857c] dark:text-[#aeb9b1]"><CircleHelp className="size-4" /> {session?.user?.email ?? "Signed-in workspace"}</div>
          <button onClick={() => void signOut({ callbackUrl: "/login" })} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-xs text-[#7b857c] hover:bg-[#f1f0eb] dark:text-[#aeb9b1] dark:hover:bg-[#25312a]"><LogOut className="size-4" /> Sign out</button>
        </div>
      </aside>

      <div className="lg:pl-62">
        <header className="sticky top-0 z-20 flex h-17 items-center justify-between border-b border-[#e7e4dc]/90 bg-[#f7f6f2]/90 px-5 backdrop-blur-md dark:border-[#2d3932] dark:bg-[#131a17]/90 sm:px-8">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-md bg-[#dbe5d8] text-[#365a46] dark:bg-[#2f4337] dark:text-[#bbd0bd] lg:hidden"><WalletCards className="size-4" /></div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#89938a]">Finance workspace</p>
              <p className="text-[13px] font-medium text-[#36443b] dark:text-[#d9e0da]">Personal & business</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex h-8 items-center gap-1.5 rounded-md border border-[#e1e2d9] bg-[#fbfaf7] px-2 text-[10px] text-[#758078] dark:border-[#344139] dark:bg-[#1b2520] dark:text-[#b3bdb5]">Currency<select aria-label="Display currency" value={currency} onChange={(event) => setCurrency(event.target.value as "ETB" | "USD")} className="bg-transparent text-[11px] font-semibold text-[#36443b] outline-none dark:text-[#d9e0da]"><option value="ETB">ETB</option><option value="USD">USD</option></select></label>
            <ThemeToggle />
            <button onClick={() => void signOut({ callbackUrl: "/login" })} aria-label="Sign out" title="Sign out" className="grid size-8 place-items-center rounded text-[#758078] hover:bg-[#f1f0eb] dark:text-[#b3bdb5] dark:hover:bg-[#25312a] lg:hidden"><LogOut className="size-4" /></button>
            <div title={displayName} className="ml-1 grid size-8 place-items-center rounded-full bg-[#e6d8c8] text-[11px] font-semibold text-[#6e5340] dark:bg-[#51463a] dark:text-[#efdfca]">{initials}</div>
          </div>
        </header>
        <main className="mx-auto min-h-[calc(100vh-68px)] max-w-370 px-5 pb-24 pt-7 sm:px-8 sm:pt-9 lg:px-10 lg:pb-10">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-[#e7e4dc] bg-[#fbfaf7]/95 px-3 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur dark:border-[#2d3932] dark:bg-[#19211d]/95 lg:hidden">
        {navigation.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return <Link key={href} href={href} className={cn("flex flex-1 flex-col items-center gap-1 py-1.5 text-[10px] font-medium", active ? "text-[#315541] dark:text-[#d0e0d1]" : "text-[#8b948b]")}><Icon className="size-4.5" strokeWidth={1.8} />{label}</Link>;
        })}
      </nav>
    </div>
  );
}