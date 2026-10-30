"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CurrencyCode, FinanceInsights } from "@/lib/finance-types";
import { formatCurrency } from "@/lib/utils";

export function SpendingCategoryChart({ categories, currency }: { categories: FinanceInsights["categories"]; currency: CurrencyCode }) {
  if (!categories.length) return <div className="grid h-full place-items-center text-xs text-[#8b948b]">No spending data for this month</div>;
  return <ResponsiveContainer width="100%" height="100%">
    <BarChart data={categories.slice(0, 7)} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 8 }}>
      <CartesianGrid horizontal={false} stroke="#e9e7e0" strokeDasharray="3 4" />
      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#8b948b", fontSize: 10 }} tickFormatter={(value: number) => value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)} />
      <YAxis type="category" dataKey="name" width={95} axisLine={false} tickLine={false} tick={{ fill: "#78827a", fontSize: 10 }} />
      <Tooltip formatter={(value, name) => [formatCurrency(Number(value), currency), name === "current" ? "This month" : "Previous month"]} contentStyle={{ borderRadius: 6, border: "1px solid #e4e0d9", fontSize: 12 }} />
      <Bar dataKey="previous" name="Previous month" fill="#aebdb0" radius={[0, 3, 3, 0]} maxBarSize={20} />
      <Bar dataKey="current" name="This month" fill="#6e9675" radius={[0, 3, 3, 0]} maxBarSize={20} />
    </BarChart>
  </ResponsiveContainer>;
}

export function WeekComparisonChart({ weeks, currency }: { weeks: FinanceInsights["weeks"]; currency: CurrencyCode }) {
  return <ResponsiveContainer width="100%" height="100%">
    <BarChart data={weeks} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barGap={5}>
      <CartesianGrid vertical={false} stroke="#e9e7e0" strokeDasharray="3 4" />
      <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "#8b948b", fontSize: 10 }} />
      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8b948b", fontSize: 10 }} tickFormatter={(value: number) => value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)} />
      <Tooltip formatter={(value, name) => [formatCurrency(Number(value), currency), name === "current" ? "Last 7 days" : "Previous 7 days"]} contentStyle={{ borderRadius: 6, border: "1px solid #e4e0d9", fontSize: 12 }} />
      <Bar dataKey="previous" name="Previous 7 days" fill="#aebdb0" radius={[3, 3, 0, 0]} maxBarSize={34} />
      <Bar dataKey="current" name="Last 7 days" fill="#6e9675" radius={[3, 3, 0, 0]} maxBarSize={34} />
    </BarChart>
  </ResponsiveContainer>;
}
