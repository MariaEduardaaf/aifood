import NextAuth, { CredentialsSignin } from "next-auth";
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

// Login throttling inside a sliding window: attempts per email+IP, plus
// looser caps per IP (spraying many emails) and per email (backstop when the
// IP is spoofed or rotated). Rows for the email are deleted on success.
const MAX_ATTEMPTS_PER_EMAIL_IP = 5;
const MAX_ATTEMPTS_PER_IP = 30;
const MAX_ATTEMPTS_PER_EMAIL = 30;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_EMAIL_LENGTH = 254;

// bcrypt hash (cost 12, same as real ones) of a random string, compared when
// the user does not exist so response time does not reveal valid emails
const DUMMY_HASH = "$2b$12$35Tw3RwpQ3XFfRF3Z4hxN.491TzBeetKOxd9Bsl93Kb8ADZP36eIu";

// First x-forwarded-for hop: the client as seen by the platform proxy.
// ponytail: trusts the header; fine behind Railway/Fly, which set it.
function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0].trim().slice(0, 64) || null;
}

// Surfaces as `?error=CredentialsSignin&code=rate_limited` on the login page
class TooManyAttempts extends CredentialsSignin {
  code = "rate_limited";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = String(credentials.email).trim().toLowerCase();
        if (email.length > MAX_EMAIL_LENGTH) return null;

        // Dynamic import to avoid build-time database connection
        const { prisma } = await import("@/lib/db");

        const ip = clientIp(request);
        const windowStart = new Date(Date.now() - LOGIN_WINDOW_MS);

        // Record first, then count: parallel bursts all see each other's rows,
        // so at most MAX_ATTEMPTS_PER_EMAIL_IP of them get to bcrypt.
        await prisma.loginAttempt.create({ data: { email, ip } });
        const recent = { created_at: { gte: windowStart } };
        const [perEmailIp, perIp, perEmail] = await Promise.all([
          prisma.loginAttempt.count({ where: { email, ip, ...recent } }),
          ip ? prisma.loginAttempt.count({ where: { ip, ...recent } }) : 0,
          prisma.loginAttempt.count({ where: { email, ...recent } }),
        ]);

        // ponytail: prunes expired rows on every rejected attempt; fine while
        // the table stays small, move to a cron if it ever grows
        const prune = () =>
          prisma.loginAttempt.deleteMany({
            where: { created_at: { lt: windowStart } },
          });

        if (
          perEmailIp > MAX_ATTEMPTS_PER_EMAIL_IP ||
          perIp > MAX_ATTEMPTS_PER_IP ||
          perEmail > MAX_ATTEMPTS_PER_EMAIL
        ) {
          await prune();
          throw new TooManyAttempts();
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: { restaurant: { select: { active: true } } },
        });

        // Always run bcrypt so unknown and known emails take the same time
        const isPasswordValid = await compare(
          String(credentials.password),
          user?.password_hash ?? DUMMY_HASH,
        );

        if (
          !user ||
          !isPasswordValid ||
          !user.active ||
          (user.role !== "SUPER_ADMIN" && !user.restaurant.active)
        ) {
          await prune();
          return null;
        }

        await prisma.loginAttempt.deleteMany({ where: { email } });

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
