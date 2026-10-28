import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getFinanceUserId } from "@/lib/server-user";

const profileSchema = z.object({ currency: z.enum(["ETB", "USD"]) });

export async function GET() {
  const userId = await getFinanceUserId();
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { currency: true } });
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
    return NextResponse.json(user);
  } catch (error) {
    console.error("GET /api/profile failed", error);
    return NextResponse.json({ error: "Could not load preferences." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const userId = await getFinanceUserId();
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Currency must be ETB or USD." }, { status: 400 });
  try {
    const user = await prisma.user.update({ where: { id: userId }, data: { currency: parsed.data.currency }, select: { currency: true } });
    return NextResponse.json(user);
  } catch (error) {
    console.error("PUT /api/profile failed", error);
    return NextResponse.json({ error: "Could not save preferences." }, { status: 503 });
  }
}