import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getFinanceUser } from "@/lib/server-user";

const taskSchema = z.object({
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(1000).optional().nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED"]).default("TODO"),
  dueDate: z.coerce.date().optional().nullable(),
});

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const user = await getFinanceUser();
    const tasks = await prisma.task.findMany({ where: { userId: user.id }, orderBy: [{ createdAt: "desc" }] });
    return NextResponse.json(tasks.map((task) => ({ ...task, dueDate: task.dueDate?.toISOString() ?? null })));
  } catch (error) {
    console.error("GET /api/tasks failed", error);
    return errorResponse("Finance database is unavailable.", 503);
  }
}

async function saveTask(request: Request, update: boolean) {
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : undefined;
  if (update && !id) return errorResponse("Task id is required.");
  const parsed = taskSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid task.", details: parsed.error.flatten() }, { status: 400 });
  try {
    const user = await getFinanceUser();
    const data = { ...parsed.data, description: parsed.data.description || null };
    const task = update
      ? await prisma.task.update({ where: { id, userId: user.id }, data })
      : await prisma.task.create({ data: { ...data, userId: user.id } });
    return NextResponse.json({ ...task, dueDate: task.dueDate?.toISOString() ?? null }, { status: update ? 200 : 201 });
  } catch (error) {
    console.error(`${update ? "PUT" : "POST"} /api/tasks failed`, error);
    return errorResponse("Could not save task.", 503);
  }
}

export async function POST(request: Request) {
  return saveTask(request, false);
}

export async function PUT(request: Request) {
  return saveTask(request, true);
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return errorResponse("Task id is required.");
  try {
    const user = await getFinanceUser();
    const result = await prisma.task.deleteMany({ where: { id, userId: user.id } });
    if (!result.count) return errorResponse("Task not found.", 404);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tasks failed", error);
    return errorResponse("Could not delete task.", 503);
  }
}