import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { Providers } from "@/app/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ledgerly | Personal & Business Finance",
  description: "A clear view of your money, budgets, and work.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased"><Providers><AppShell>{children}</AppShell></Providers></body>
    </html>
  );
}
