import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getFinanceUser } from "@/lib/server-user";

const transactionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  amount: z.coerce.number().positive().finite(),
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.string().trim().min(1).max(60),
  date: z.coerce.date(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

const querySchema = z.object({
  start: z.coerce.date().optional(),
  end: z.coerce.date().optional(),
  category: z.string().optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
});

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function serialize(transaction: { id: string; title: string; amount: unknown; type: string; date: Date; notes: string | null; category: { id: string; name: string; color: string } }) {
  return {
    ...transaction,
    amount: Number(transaction.amount),
    date: transaction.date.toISOString(),
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filters = querySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!filters.success) return jsonError("Invalid transaction filters.");
    const user = await getFinanceUser();
    const { start, end, category, type } = filters.data;
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        ...(start || end ? { date: { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) } } : {}),
        ...(category ? { category: { name: category } } : {}),
        ...(type ? { type } : {}),
      },
      include: { category: { select: { id: true, name: true, color: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(transactions.map(serialize));
  } catch (error) {
    console.error("GET /api/transactions failed", error);
    return jsonError("Finance database is unavailable. Check DATABASE_URL and run the Prisma migrations.", 503);
  }
}

async function saveTransaction(request: Request, update: boolean) {
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : undefined;
  if (update && !id) return jsonError("Transaction id is required.");
  const parsed = transactionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid transaction.", details: parsed.error.flatten() }, { status: 400 });

  try {
    const user = await getFinanceUser();
    const values = parsed.data;
    const category = await prisma.category.upsert({
      where: { userId_name: { userId: user.id, name: values.category } },
      update: { type: values.type, color: categoryColor(values.category) },
      create: { userId: user.id, name: values.category, type: values.type, color: categoryColor(values.category) },
    });
    const data = {
      title: values.title,
      amount: values.amount,
      type: values.type,
      date: values.date,
      notes: values.notes || null,
      categoryId: category.id,
    };
    const transaction = update
      ? await prisma.transaction.update({
          where: { id, userId: user.id },
          data,
          include: { category: { select: { id: true, name: true, color: true } } },
        })
      : await prisma.transaction.create({
          data: { ...data, userId: user.id },
          include: { category: { select: { id: true, name: true, color: true } } },
        });
    return NextResponse.json(serialize(transaction), { status: update ? 200 : 201 });
  } catch (error) {
    console.error(`${update ? "PUT" : "POST"} /api/transactions failed`, error);
    return jsonError("Could not save transaction.", 503);
  }
}

export async function POST(request: Request) {
  return saveTransaction(request, false);
}

export async function PUT(request: Request) {
  return saveTransaction(request, true);
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError("Transaction id is required.");
  try {
    const user = await getFinanceUser();
    const result = await prisma.transaction.deleteMany({ where: { id, userId: user.id } });
    if (!result.count) return jsonError("Transaction not found.", 404);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/transactions failed", error);
    return jsonError("Could not delete transaction.", 503);
  }
}

function categoryColor(category: string) {
  const colors: Record<string, string> = {
    "Food / Cafe": "#d3784d",
    Transport: "#568a86",
    Rent: "#92775c",
    Salary: "#70946d",
    Shopping: "#bc785e",
    Utilities: "#788caa",
    Business: "#7c8460",
  };
  return colors[category] ?? "#8b806e";
}