import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getFinanceUserId } from "@/lib/server-user";

const lineItemSchema = z.object({
  description: z.string().trim().min(1).max(160),
  quantity: z.coerce.number().positive().finite(),
  unitPrice: z.coerce.number().min(0).finite(),
});

const createInvoiceSchema = z.object({
  invoiceNumber: z.string().trim().min(1).max(40),
  clientId: z.string().min(1).optional().nullable(),
  clientName: z.string().trim().min(1).max(120),
  clientEmail: z.string().trim().email().max(254).optional().or(z.literal("")),
  clientCompany: z.string().trim().max(120).optional(),
  lineItems: z.array(lineItemSchema).min(1).max(50),
  currency: z.enum(["ETB", "USD", "EUR"]),
  dueDate: z.coerce.date(),
});

const statusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["PAID", "PENDING"]),
});

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function currentStatus(status: string, dueDate: Date): "PAID" | "PENDING" | "OVERDUE" {
  if (status === "PAID") return "PAID";
  return dueDate.toISOString().slice(0, 10) < new Date().toISOString().slice(0, 10) ? "OVERDUE" : "PENDING";
}

export async function GET() {
  try {
    const userId = await getFinanceUserId();
    if (!userId) return errorResponse("Authentication required.", 401);
    const [clients, invoices] = await Promise.all([
      prisma.client.findMany({ where: { userId }, orderBy: { name: "asc" } }),
      prisma.invoice.findMany({
        where: { userId },
        include: { client: true },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      }),
    ]);
    return NextResponse.json({
      clients,
      invoices: invoices.map((invoice) => ({
        ...invoice,
        totalAmount: Number(invoice.totalAmount),
        status: currentStatus(invoice.status, invoice.dueDate),
        dueDate: invoice.dueDate.toISOString(),
        createdAt: invoice.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("GET /api/invoices failed", error);
    return errorResponse("Could not load client invoices.", 503);
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createInvoiceSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid invoice.", details: parsed.error.flatten() }, { status: 400 });
  try {
    const userId = await getFinanceUserId();
    if (!userId) return errorResponse("Authentication required.", 401);
    const values = parsed.data;
    const invoice = await prisma.$transaction(async (database) => {
      let client;
      if (values.clientId) {
        client = await database.client.findFirst({ where: { id: values.clientId, userId } });
        if (!client) throw new Error("CLIENT_NOT_FOUND");
      } else {
        client = await database.client.create({
          data: {
            userId,
            name: values.clientName,
            email: values.clientEmail || null,
            company: values.clientCompany || null,
          },
        });
      }
      const totalAmount = values.lineItems.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
      return database.invoice.create({
        data: {
          userId,
          clientId: client.id,
          clientName: values.clientName,
          invoiceNumber: values.invoiceNumber,
          lineItems: values.lineItems,
          totalAmount,
          currency: values.currency,
          dueDate: values.dueDate,
        },
        include: { client: true },
      });
    });
    return NextResponse.json({
      ...invoice,
      totalAmount: Number(invoice.totalAmount),
      dueDate: invoice.dueDate.toISOString(),
      createdAt: invoice.createdAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "CLIENT_NOT_FOUND") return errorResponse("Selected client not found.", 404);
    console.error("POST /api/invoices failed", error);
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return errorResponse("Invoice number is already in use.", 409);
    }
    return errorResponse("Could not create invoice. Invoice numbers must be unique.", 503);
  }
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid invoice status update.", details: parsed.error.flatten() }, { status: 400 });
  try {
    const userId = await getFinanceUserId();
    if (!userId) return errorResponse("Authentication required.", 401);
    const result = await prisma.invoice.updateMany({
      where: { id: parsed.data.id, userId },
      data: { status: parsed.data.status },
    });
    if (!result.count) return errorResponse("Invoice not found.", 404);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/invoices failed", error);
    return errorResponse("Could not update invoice.", 503);
  }
}
