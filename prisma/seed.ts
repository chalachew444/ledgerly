import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const demoEmail = "demo@ledgerly.com";
const demoPassword = process.env.DEMO_PASSWORD ?? "LedgerlyDemo!2026";
const today = new Date();
const daysAgo = (days: number) => {
  const date = new Date(today);
  date.setDate(date.getDate() - days);
  date.setHours(12, 0, 0, 0);
  return date;
};

async function main() {
  const demoUser = await prisma.user.upsert({
    where: { email: demoEmail },
    update: { name: "Ledgerly Demo", passwordHash: await hash(demoPassword, 12) },
    create: {
      email: demoEmail,
      name: "Ledgerly Demo",
      currency: "ETB",
      passwordHash: await hash(demoPassword, 12),
    },
  });

  const categories = [
    { name: "Food / Cafe", color: "#d3784d", type: "EXPENSE" as const },
    { name: "Transport", color: "#568a86", type: "EXPENSE" as const },
    { name: "Rent", color: "#92775c", type: "EXPENSE" as const },
    { name: "Salary", color: "#70946d", type: "INCOME" as const },
    { name: "Business", color: "#7c8460", type: "BOTH" as const },
    { name: "Utilities", color: "#788caa", type: "EXPENSE" as const },
    { name: "Education", color: "#8b806e", type: "EXPENSE" as const },
  ];
  const savedCategories = await Promise.all(categories.map((category) => prisma.category.upsert({
    where: { userId_name: { userId: demoUser.id, name: category.name } },
    update: category,
    create: { ...category, userId: demoUser.id },
  })));
  const categoryByName = new Map(savedCategories.map((category) => [category.name, category]));

  const transactions = [
    { id: "ledgerly-demo-salary", title: "Monthly salary", amount: 28500, type: "INCOME" as const, category: "Salary", days: 1, notes: "October payroll" },
    { id: "ledgerly-demo-cafe", title: "Cafe & lunch", amount: 245, type: "EXPENSE" as const, category: "Food / Cafe", days: 1, notes: "Lunch with the team" },
    { id: "ledgerly-demo-rent", title: "Apartment rent", amount: 8200, type: "EXPENSE" as const, category: "Rent", days: 3, notes: null },
    { id: "ledgerly-demo-client", title: "Client project", amount: 6500, type: "INCOME" as const, category: "Business", days: 5, notes: "Brand identity milestone" },
    { id: "ledgerly-demo-ride", title: "Ride share", amount: 180, type: "EXPENSE" as const, category: "Transport", days: 6, notes: null },
    { id: "ledgerly-demo-grocery", title: "Market groceries", amount: 1320, type: "EXPENSE" as const, category: "Food / Cafe", days: 9, notes: null },
    { id: "ledgerly-demo-electricity", title: "Electricity bill", amount: 760, type: "EXPENSE" as const, category: "Utilities", days: 12, notes: null },
    { id: "ledgerly-demo-course", title: "Online course", amount: 950, type: "EXPENSE" as const, category: "Education", days: 17, notes: null },
    { id: "ledgerly-demo-retainer", title: "Consulting retainer", amount: 8400, type: "INCOME" as const, category: "Business", days: 24, notes: null },
    { id: "ledgerly-demo-transit", title: "Transport pass", amount: 540, type: "EXPENSE" as const, category: "Transport", days: 31, notes: null },
  ];

  await Promise.all(transactions.map((transaction) => {
    const category = categoryByName.get(transaction.category);
    if (!category) throw new Error(`Missing demo category: ${transaction.category}`);
    return prisma.transaction.upsert({
      where: { id: transaction.id },
      update: {
        title: transaction.title,
        amount: transaction.amount,
        type: transaction.type,
        date: daysAgo(transaction.days),
        notes: transaction.notes,
        categoryId: category.id,
        userId: demoUser.id,
      },
      create: {
        id: transaction.id,
        title: transaction.title,
        amount: transaction.amount,
        type: transaction.type,
        date: daysAgo(transaction.days),
        notes: transaction.notes,
        categoryId: category.id,
        userId: demoUser.id,
      },
    });
  }));

  const budgets = [
    { category: "Food / Cafe", amount: 2000 },
    { category: "Transport", amount: 1800 },
    { category: "Utilities", amount: 1200 },
  ];
  await Promise.all(budgets.map((budget) => {
    const category = categoryByName.get(budget.category);
    if (!category) throw new Error(`Missing demo category: ${budget.category}`);
    return prisma.budget.upsert({
      where: { userId_categoryId_period: { userId: demoUser.id, categoryId: category.id, period: "MONTHLY" } },
      update: { amount: budget.amount },
      create: { userId: demoUser.id, categoryId: category.id, amount: budget.amount, period: "MONTHLY" },
    });
  }));

  const tasks = [
    { id: "ledgerly-demo-task-review", title: "Review monthly cash flow", description: "Reconcile personal and business accounts.", status: "TODO" as const, daysUntilDue: 2 },
    { id: "ledgerly-demo-task-invoice", title: "Send invoice to Abay Studio", description: "Invoice for the October design milestone.", status: "IN_PROGRESS" as const, daysUntilDue: 1 },
    { id: "ledgerly-demo-task-budget", title: "Set cafe spending limit", description: null, status: "COMPLETED" as const, daysUntilDue: null },
  ];
  await Promise.all(tasks.map((task) => {
    const dueDate = task.daysUntilDue === null ? null : new Date(today.getTime() + task.daysUntilDue * 24 * 60 * 60 * 1000);
    return prisma.task.upsert({
      where: { id: task.id },
      update: { title: task.title, description: task.description, status: task.status, dueDate, userId: demoUser.id },
      create: {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        dueDate,
        userId: demoUser.id,
      },
    });
  }));

  console.info(`Seeded demo workspace for ${demoEmail}.`);
}

main()
  .catch((error: unknown) => {
    console.error("Demo seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });