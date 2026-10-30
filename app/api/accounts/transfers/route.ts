import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchExchangeRates } from "@/lib/exchange-rates";
import { prisma } from "@/lib/prisma";
import { getFinanceUserId } from "@/lib/server-user";

const transferSchema = z.object({
  sourceAccountId: z.string().min(1),
  destinationAccountId: z.string().min(1),
  amount: z.coerce.number().positive().finite(),
});

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = transferSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid transfer.", details: parsed.error.flatten() }, { status: 400 });
  const { sourceAccountId, destinationAccountId, amount } = parsed.data;
  if (sourceAccountId === destinationAccountId) return errorResponse("Choose two different wallets.");

  try {
    const userId = await getFinanceUserId();
    if (!userId) return errorResponse("Authentication required.", 401);
    const [source, destination] = await Promise.all([
      prisma.account.findFirst({ where: { id: sourceAccountId, userId, name: { not: null } }, select: { id: true, currency: true } }),
      prisma.account.findFirst({ where: { id: destinationAccountId, userId, name: { not: null } }, select: { id: true, currency: true } }),
    ]);
    if (!source || !destination) return errorResponse("Wallet not found.", 404);
    const currencies = z.enum(["ETB", "USD", "EUR"]);
    const parsedSourceCurrency = currencies.safeParse(source.currency ?? "ETB");
    const parsedDestinationCurrency = currencies.safeParse(destination.currency ?? "ETB");
    if (!parsedSourceCurrency.success || !parsedDestinationCurrency.success) return errorResponse("Wallet has an unsupported currency.", 409);
    const sourceCurrency = parsedSourceCurrency.data;
    const destinationCurrency = parsedDestinationCurrency.data;
    let exchangeRate = 1;
    if (sourceCurrency !== destinationCurrency) {
      const rates = await fetchExchangeRates();
      exchangeRate = rates.rates[destinationCurrency] / rates.rates[sourceCurrency];
    }
    const destinationAmount = Math.round(amount * exchangeRate * 100) / 100;

    const transfer = await prisma.$transaction(async (database) => {
      const [income, expenses, outgoing, incoming] = await Promise.all([
        database.transaction.aggregate({ where: { userId, accountId: source.id, type: "INCOME" }, _sum: { amount: true } }),
        database.transaction.aggregate({ where: { userId, accountId: source.id, type: "EXPENSE" }, _sum: { amount: true } }),
        database.accountTransfer.aggregate({ where: { userId, sourceAccountId: source.id }, _sum: { sourceAmount: true } }),
        database.accountTransfer.aggregate({ where: { userId, destinationAccountId: source.id }, _sum: { destinationAmount: true } }),
      ]);
      const opening = await database.account.findUnique({ where: { id: source.id }, select: { openingBalance: true } });
      const balance = Number(opening?.openingBalance ?? 0)
        + Number(income._sum.amount ?? 0)
        - Number(expenses._sum.amount ?? 0)
        - Number(outgoing._sum.sourceAmount ?? 0)
        + Number(incoming._sum.destinationAmount ?? 0);
      if (amount > balance) throw new Error("INSUFFICIENT_FUNDS");
      return database.accountTransfer.create({
        data: { userId, sourceAccountId: source.id, destinationAccountId: destination.id, sourceAmount: amount, destinationAmount, exchangeRate },
      });
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({
      id: transfer.id,
      sourceAmount: Number(transfer.sourceAmount),
      destinationAmount: Number(transfer.destinationAmount),
      exchangeRate: Number(transfer.exchangeRate),
      sourceCurrency,
      destinationCurrency,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_FUNDS") return errorResponse("The source wallet does not have enough available funds.", 409);
    console.error("POST /api/accounts/transfers failed", error);
    return errorResponse("Could not complete the wallet transfer.", 503);
  }
}
