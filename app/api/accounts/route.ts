import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getFinanceUserId } from "@/lib/server-user";

const accountSchema = z.object({
  name: z.string().trim().min(1).max(60),
  currency: z.enum(["ETB", "USD", "EUR"]),
  openingBalance: z.coerce.number().finite(),
});

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const userId = await getFinanceUserId();
    if (!userId) return errorResponse("Authentication required.", 401);
    const [accounts, income, expenses, outgoing, incoming] = await Promise.all([
      prisma.account.findMany({
        where: { userId, name: { not: null } },
        select: { id: true, name: true, currency: true, openingBalance: true },
        orderBy: { name: "asc" },
      }),
      prisma.transaction.groupBy({ by: ["accountId"], where: { userId, type: "INCOME", accountId: { not: null } }, _sum: { amount: true } }),
      prisma.transaction.groupBy({ by: ["accountId"], where: { userId, type: "EXPENSE", accountId: { not: null } }, _sum: { amount: true } }),
      prisma.accountTransfer.groupBy({ by: ["sourceAccountId"], where: { userId }, _sum: { sourceAmount: true } }),
      prisma.accountTransfer.groupBy({ by: ["destinationAccountId"], where: { userId }, _sum: { destinationAmount: true } }),
    ]);
    const incomeByAccount = new Map(income.map((item) => [item.accountId, Number(item._sum.amount ?? 0)]));
    const expensesByAccount = new Map(expenses.map((item) => [item.accountId, Number(item._sum.amount ?? 0)]));
    const outgoingByAccount = new Map(outgoing.map((item) => [item.sourceAccountId, Number(item._sum.sourceAmount ?? 0)]));
    const incomingByAccount = new Map(incoming.map((item) => [item.destinationAccountId, Number(item._sum.destinationAmount ?? 0)]));
    return NextResponse.json(accounts.map((account) => ({
      id: account.id,
      name: account.name ?? "Wallet",
      currency: account.currency === "USD" || account.currency === "EUR" ? account.currency : "ETB",
      openingBalance: Number(account.openingBalance ?? 0),
      balance: Number(account.openingBalance ?? 0)
        + (incomeByAccount.get(account.id) ?? 0)
        - (expensesByAccount.get(account.id) ?? 0)
        - (outgoingByAccount.get(account.id) ?? 0)
        + (incomingByAccount.get(account.id) ?? 0),
    })));
  } catch (error) {
    console.error("GET /api/accounts failed", error);
    return errorResponse("Could not load wallet accounts.", 503);
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = accountSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid wallet account.", details: parsed.error.flatten() }, { status: 400 });
  try {
    const userId = await getFinanceUserId();
    if (!userId) return errorResponse("Authentication required.", 401);
    const account = await prisma.account.create({
      data: {
        userId,
        name: parsed.data.name,
        currency: parsed.data.currency,
        openingBalance: parsed.data.openingBalance,
      },
      select: { id: true, name: true, currency: true, openingBalance: true },
    });
    return NextResponse.json({
      ...account,
      currency: account.currency ?? "ETB",
      openingBalance: Number(account.openingBalance ?? 0),
      balance: Number(account.openingBalance ?? 0),
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/accounts failed", error);
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return errorResponse("A wallet with this name already exists.", 409);
    }
    return errorResponse("Could not create wallet account. Account names must be unique.", 503);
  }
}
