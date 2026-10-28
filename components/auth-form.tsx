"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuthMode = "login" | "register";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const registering = mode === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (registering && password !== confirmation) {
      setError("Those passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      if (registering) {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const result = await response.json() as { error?: string };
        if (!response.ok) {
          setError(result.error ?? "Could not create your account.");
          return;
        }
      }
      const result = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/" });
      if (result?.error) {
        setError("We could not sign you in with those details.");
        return;
      }
      router.replace(result?.url ?? "/");
      router.refresh();
    } catch {
      setError("The service is temporarily unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function tryDemo() {
    setError("");
    setBusy(true);
    try {
      const result = await signIn("credentials", {
        email: "demo@ledgerly.com",
        password: process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "LedgerlyDemo!2026",
        redirect: false,
        callbackUrl: "/",
      });
      if (result?.error) {
        setError("Demo sign-in is unavailable. Run the database migration and demo seed first.");
        return;
      }
      router.replace(result?.url ?? "/");
      router.refresh();
    } catch {
      setError("Demo sign-in is temporarily unavailable.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative grid min-h-screen overflow-hidden bg-[#f7f6f2] text-[#26352e] dark:bg-[#131a17] dark:text-[#e8ece8] lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-[#254036] px-12 py-10 text-[#f1f3eb] dark:bg-[#20342b] lg:flex xl:px-16">
        <div className="absolute -right-36 -top-32 size-[520px] rounded-full border border-white/10" />
        <div className="absolute -right-20 -top-16 size-[380px] rounded-full border border-white/10" />
        <Link href="/login" className="relative z-10 inline-flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-[#dce7dc] text-[#355642]"><WalletCards className="size-5" /></span><span className="font-semibold">Ledgerly</span></Link>
        <div className="relative z-10 max-w-xl pb-16">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b8cbb9]">A calmer way to handle money</p>
          <h1 className="text-[46px] font-semibold leading-[1.08]">Make every birr and dollar easier to follow.</h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-[#c5d1c6]">Keep personal spending, business income, budgets, and the work behind it together.</p>
        </div>
        <p className="relative z-10 text-[11px] text-[#b8cbb9]">Personal finance · Small business · Clear decisions</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[410px]">
          <Link href="/login" className="mb-9 inline-flex items-center gap-2 text-sm font-semibold lg:hidden"><span className="grid size-8 place-items-center rounded-md bg-[#dce7dc] text-[#355642]"><WalletCards className="size-4" /></span>Ledgerly</Link>
          <div className="mb-7"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7d8c80]">Finance workspace</p><h2 className="mt-2 text-[26px] font-semibold">{registering ? "Create your account" : "Welcome back"}</h2><p className="mt-2 text-sm text-[#7e8980] dark:text-[#aab4ac]">{registering ? "Start organizing your personal and business finances." : "Sign in to pick up where you left off."}</p></div>

          <form onSubmit={submit} className="space-y-4">
            {registering && <label className="block space-y-1.5 text-xs font-medium text-[#68736b] dark:text-[#b2bbb4]">Name<Input required maxLength={80} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" /></label>}
            <label className="block space-y-1.5 text-xs font-medium text-[#68736b] dark:text-[#b2bbb4]">Email address<Input required type="email" maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
            <label className="block space-y-1.5 text-xs font-medium text-[#68736b] dark:text-[#b2bbb4]">Password<Input required type="password" minLength={registering ? 12 : 1} maxLength={72} autoComplete={registering ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={registering ? "At least 12 characters" : "Your password"} /></label>
            {registering && <label className="block space-y-1.5 text-xs font-medium text-[#68736b] dark:text-[#b2bbb4]">Confirm password<Input required type="password" minLength={12} maxLength={72} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Enter it again" /></label>}
            {error && <p role="alert" className="rounded-md border border-[#efd2c5] bg-[#fff4ee] px-3 py-2.5 text-xs text-[#9b5638] dark:border-[#684536] dark:bg-[#34251f] dark:text-[#e5a181]">{error}</p>}
            <Button className="w-full" type="submit" disabled={busy}>{busy && <LoaderCircle className="size-4 animate-spin" />}{registering ? "Create account" : "Sign in"}<ArrowRight className="size-4" /></Button>
          </form>

          {!registering && <><div className="my-5 flex items-center gap-3"><span className="h-px flex-1 bg-[#e4e2db] dark:bg-[#344139]" /><span className="text-[10px] uppercase tracking-[0.1em] text-[#929990]">or</span><span className="h-px flex-1 bg-[#e4e2db] dark:bg-[#344139]" /></div><Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => void tryDemo()}>{busy && <LoaderCircle className="size-4 animate-spin" />}Try Demo Account</Button></>}

          <p className="mt-6 text-center text-xs text-[#7e8980] dark:text-[#aab4ac]">{registering ? "Already have an account?" : "New to Ledgerly?"} <Link href={registering ? "/login" : "/register"} className="font-semibold text-[#466557] hover:underline dark:text-[#b0c5b3]">{registering ? "Sign in" : "Create an account"}</Link></p>
          {!registering && <p className="mt-5 text-center text-[10px] leading-5 text-[#99a198]">Demo workspaces are shared and resettable. Do not enter private financial details.</p>}
        </div>
      </section>
    </main>
  );
}