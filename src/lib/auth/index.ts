import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name: string;
    role: Role;
    restaurant_id: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      restaurant_id: string;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    restaurant_id: string;
    checkedAt?: number;
  }
}

// How often the JWT is re-validated against the database (ms)
const RECHECK_INTERVAL_MS = 5 * 60 * 1000;

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Dynamic import to avoid build-time database connection
        const { prisma } = await import("@/lib/db");

        const user = await prisma.user.findUnique({
          where: { email: (credentials.email as string).trim().toLowerCase() },
          include: { restaurant: { select: { active: true } } },
        });

        if (
          !user ||
          !user.active ||
          (user.role !== "SUPER_ADMIN" && !user.restaurant.active)
        ) {
          return null;
        }

        const isPasswordValid = await compare(
          credentials.password as string,
          user.password_hash,
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          restaurant_id: user.restaurant_id,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.restaurant_id = user.restaurant_id;
        token.checkedAt = Date.now();
        return token;
      }

      // Re-validate at most every RECHECK_INTERVAL_MS so deactivated users,
      // deactivated restaurants and role changes take effect without re-login.
      if (Date.now() - (token.checkedAt ?? 0) < RECHECK_INTERVAL_MS) {
        return token;
      }

      const { prisma } = await import("@/lib/db");
      const dbUser = await prisma.user.findUnique({
        where: { id: token.id },
        select: {
          role: true,
          active: true,
          restaurant_id: true,
          restaurant: { select: { active: true } },
        },
      });

      if (
        !dbUser ||
        !dbUser.active ||
        (dbUser.role !== "SUPER_ADMIN" && !dbUser.restaurant.active)
      ) {
        return null; // Clears the session cookie
      }

      token.role = dbUser.role;
      token.restaurant_id = dbUser.restaurant_id;
      token.checkedAt = Date.now();
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.restaurant_id = token.restaurant_id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 12 * 60 * 60, // 12h
  },
});
