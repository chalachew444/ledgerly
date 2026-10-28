"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/utils";

type MonthlyPoint = { month: string; income: number; expense: number };
type CategoryPoint = { name: string; value: number; color: string };

const axisColor = "#8b948b";

export function MonthlyChart({ data, currency }: { data: MonthlyPoint[]; currency: "ETB" | "USD" }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }} barGap={5}>
        <CartesianGrid vertical={false} stroke="#e9e7e0" strokeDasharray="3 4" />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: axisColor, fontSize: 11 }} dy={8} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: axisColor, fontSize: 10 }} tickFormatter={(value: number) => value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)} />
        <Tooltip cursor={{ fill: "#edf1ea" }} formatter={(value) => [formatCurrency(Number(value), currency)]} contentStyle={{ borderRadius: 6, border: "1px solid #e4e0d9", fontSize: 12 }} />
        <Bar name="Income" dataKey="income" fill="#6e9675" radius={[3, 3, 0, 0]} maxBarSize={24} />
        <Bar name="Expenses" dataKey="expense" fill="#d68b68" radius={[3, 3, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryChart({ data, currency }: { data: CategoryPoint[]; currency: "ETB" | "USD" }) {
  if (!data.length) return <div className="grid h-full place-items-center text-xs text-[#8b948b]">No expenses in this period</div>;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="82%" paddingAngle={3} stroke="none">
          {data.map((entry, index) => <Cell key={`${entry.name}-${index}`} fill={entry.color} />)}
        </Pie>
        <Tooltip formatter={(value) => [formatCurrency(Number(value), currency)]} contentStyle={{ borderRadius: 6, border: "1px solid #e4e0d9", fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}