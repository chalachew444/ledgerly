import { prisma } from "@/lib/prisma";

export async function getFinanceUser() {
  const configuredId = process.env.FINANCE_USER_ID;
  if (process.env.NODE_ENV === "production" && !configuredId) {
    throw new Error("FINANCE_USER_ID must be configured before using the finance API.");
  }

  const id = configuredId ?? "local-demo-user";
  const email = process.env.FINANCE_USER_EMAIL ?? "finance-demo@localhost";
  return prisma.user.upsert({
    where: { id },
    update: {},
    create: { id, email, name: "Finance workspace" },
  });
}