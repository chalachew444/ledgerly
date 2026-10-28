import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  password: z.string().min(1),
});

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const isDemoLogin = parsed.data.email === "demo@ledgerly.com"
          && parsed.data.password === (process.env.DEMO_PASSWORD ?? "LedgerlyDemo!2026");
        try {
          const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
          if (user) {
            if (!user.passwordHash || !(await compare(parsed.data.password, user.passwordHash))) return null;
            return { id: user.id, email: user.email, name: user.name, image: user.image };
          }
        } catch {
          if (!isDemoLogin) return null;
        }
        if (isDemoLogin) {
          return { id: "ledgerly-offline-demo", email: "demo@ledgerly.com", name: "Ledgerly Demo" };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
};