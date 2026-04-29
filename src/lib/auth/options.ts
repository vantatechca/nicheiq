import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { findUserByEmail } from "@/mock/data";

const useMock = (process.env.USE_MOCK ?? "true") !== "false";

// Production must have a real NEXTAUTH_SECRET. If missing, fail loud at startup
// rather than silently signing JWTs with a known string.
function resolveAuthSecret(): string {
  const explicit = process.env.NEXTAUTH_SECRET;
  if (explicit) return explicit;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXTAUTH_SECRET is not set. Production requires a real secret — generate one with `openssl rand -base64 32`.",
    );
  }
  // Dev-only fallback. Does not apply in production.
  return "dev-only-not-for-production-do-not-deploy";
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;
        if (!email || !password) return null;

        if (useMock) {
          const user = findUserByEmail(email);
          if (!user) return null;
          if (password !== user.passwordHashRef) return null;
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.avatarUrl,
          };
        }

        // Real DB path — wired in Phase H
        const { getDb } = await import("@/lib/db/client");
        const { users } = await import("@/lib/db/schema");
        const { eq } = await import("drizzle-orm");
        const db = getDb();
        const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
        const row = rows[0];
        if (!row) return null;
        const ok = await compare(password, row.passwordHash);
        if (!ok) return null;
        return { id: row.id, email: row.email, name: row.name, role: row.role };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/login" },
  secret: resolveAuthSecret(),
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role?: string }).role;
        token.picture = (user as { image?: string }).image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { image?: string }).image = (token.picture as string) ?? undefined;
      }
      return session;
    },
  },
};