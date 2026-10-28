import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getFinanceUser } from "@/lib/server-user";

const budgetSchema = z.object({
  category: z.string().trim().min(1).max(60),
  amount: z.coerce.number().positive().finite(),
  period: z.enum(["MONTHLY", "WEEKLY", "YEARLY"]).default("MONTHLY"),
});

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const user = await getFinanceUser();
    const budgets = await prisma.budget.findMany({
      where: { userId: user.id },
      include: { category: { select: { id: true, name: true, color: true } } },
      orderBy: { category: { name: "asc" } },
    });
    return NextResponse.json(budgets.map((budget) => ({ ...budget, amount: Number(budget.amount) })));
  } catch (error) {
    console.error("GET /api/budgets failed", error);
    return errorResponse("Finance database is unavailable.", 503);
  }
}

async function saveBudget(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = budgetSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid budget.", details: parsed.error.flatten() }, { status: 400 });
  try {
    const user = await getFinanceUser();
    const { category: categoryName, ...values } = parsed.data;
    const category = await prisma.category.upsert({
      where: { userId_name: { userId: user.id, name: categoryName } },
      update: { type: "EXPENSE" },
      create: { userId: user.id, name: categoryName, type: "EXPENSE" },
    });
    const budget = await prisma.budget.upsert({
      where: { userId_categoryId_period: { userId: user.id, categoryId: category.id, period: values.period } },
      update: { amount: values.amount },
      create: { ...values, userId: user.id, categoryId: category.id },
      include: { category: { select: { id: true, name: true, color: true } } },
    });
    return NextResponse.json({ ...budget, amount: Number(budget.amount) });
  } catch (error) {
    console.error("POST /api/budgets failed", error);
    return errorResponse("Could not save budget.", 503);
  }
}

export async function POST(request: Request) {
  return saveBudget(request);
}

export async function PUT(request: Request) {
  return saveBudget(request);
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return errorResponse("Budget id is required.");
  try {
    const user = await getFinanceUser();
    const result = await prisma.budget.deleteMany({ where: { id, userId: user.id } });
    if (!result.count) return errorResponse("Budget not found.", 404);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/budgets failed", error);
    return errorResponse("Could not delete budget.", 503);
  }
}