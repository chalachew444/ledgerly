import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getFinanceUser } from "@/lib/server-user";

const rangeSchema = z.enum(["week", "month", "year"]).default("month");

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsedRange = rangeSchema.safeParse(url.searchParams.get("range") ?? "month");
    if (!parsedRange.success) return NextResponse.json({ error: "Invalid analytics range." }, { status: 400 });

    const user = await getFinanceUser();
    const now = new Date();
    const periodStart = new Date(now);
    if (parsedRange.data === "week") periodStart.setDate(now.getDate() - 6);
    if (parsedRange.data === "month") periodStart.setDate(1);
    if (parsedRange.data === "year") periodStart.setMonth(0, 1);
    periodStart.setHours(0, 0, 0, 0);

    const currentPeriodTransactions = await prisma.transaction.findMany({
      where: { userId: user.id, date: { gte: periodStart, lte: now } },
      include: { category: { select: { id: true, name: true, color: true } } },
      orderBy: { date: "desc" },
    });
    const totals = currentPeriodTransactions.reduce(
      (acc, transaction) => {
        const amount = Number(transaction.amount);
        if (transaction.type === "INCOME") acc.income += amount;
        else acc.expense += amount;
        return acc;
      },
      { income: 0, expense: 0 },
    );

    const chartStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const chartTransactions = await prisma.transaction.findMany({
      where: { userId: user.id, date: { gte: chartStart, lte: now }, type: "EXPENSE" },
      include: { category: { select: { id: true, name: true, color: true } } },
    });
    const byCategory = new Map<string, { name: string; value: number; color: string }>();
    for (const transaction of chartTransactions) {
      const current = byCategory.get(transaction.categoryId) ?? {
        name: transaction.category.name,
        value: 0,
        color: transaction.category.color,
      };
      current.value += Number(transaction.amount);
      byCategory.set(transaction.categoryId, current);
    }

    const monthly = Array.from({ length: 6 }, (_, index) => {
      const month = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      return {
        key: `${month.getFullYear()}-${month.getMonth()}`,
        month: month.toLocaleDateString("en", { month: "short" }),
        income: 0,
        expense: 0,
      };
    });
    const monthlyByKey = new Map(monthly.map((entry) => [entry.key, entry]));
    const allMonthlyTransactions = await prisma.transaction.findMany({
      where: { userId: user.id, date: { gte: chartStart, lte: now } },
      select: { amount: true, type: true, date: true },
    });
    for (const transaction of allMonthlyTransactions) {
      const key = `${transaction.date.getFullYear()}-${transaction.date.getMonth()}`;
      const month = monthlyByKey.get(key);
      if (month) month[transaction.type === "INCOME" ? "income" : "expense"] += Number(transaction.amount);
    }

    const budgets = await prisma.budget.findMany({
      where: { userId: user.id, period: "MONTHLY" },
      include: { category: { select: { id: true, name: true, color: true } } },
      orderBy: { category: { name: "asc" } },
    });
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const budgetSpending = await prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId: user.id, type: "EXPENSE", date: { gte: monthStart, lte: now } },
      _sum: { amount: true },
    });
    const spendingByCategory = new Map(budgetSpending.map((item) => [item.categoryId, Number(item._sum.amount ?? 0)]));

    return NextResponse.json({
      range: parsedRange.data,
      totals: { ...totals, balance: totals.income - totals.expense },
      monthly,
      categoryExpenses: Array.from(byCategory.values()).sort((a, b) => b.value - a.value),
      recent: currentPeriodTransactions.slice(0, 6).map((transaction) => ({
        id: transaction.id,
        title: transaction.title,
        amount: Number(transaction.amount),
        type: transaction.type,
        date: transaction.date.toISOString(),
        category: transaction.category,
      })),
      budgets: budgets.map((budget) => ({
        id: budget.id,
        amount: Number(budget.amount),
        category: budget.category,
        spent: spendingByCategory.get(budget.categoryId) ?? 0,
      })),
    });
  } catch (error) {
    console.error("GET /api/analytics failed", error);
    return NextResponse.json({ error: "Finance database is unavailable." }, { status: 503 });
  }
}