import crypto from "node:crypto";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Explicit expiry rather than relying on the library default — this app
  // handles billing + financial data, so sessions expire after 7 days of
  // inactivity (refreshed on activity within that window) rather than a
  // longer default.
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return { id: user.id, email: user.email };
      },
    }),
    // Second-step provider for 2FA logins: authenticates via a short-lived,
    // single-use challenge token issued only after the password already
    // checked out (see actions/two-factor.ts) — never a password directly.
    // Not reachable from the login form; only the 2FA code-verify action
    // calls signIn("two-factor", ...).
    Credentials({
      id: "two-factor",
      credentials: {
        challengeToken: { label: "Challenge token", type: "text" },
      },
      authorize: async (credentials) => {
        const challengeToken = credentials?.challengeToken;
        if (typeof challengeToken !== "string" || !challengeToken) return null;

        const tokenHash = hashToken(challengeToken);
        const challenge = await prisma.twoFactorChallenge.findUnique({ where: { tokenHash } });
        if (!challenge || challenge.expiresAt < new Date()) return null;

        // Consume it here — this authorize() is the actual point the
        // session gets established, so this is where single-use applies.
        await prisma.twoFactorChallenge.delete({ where: { id: challenge.id } });

        const user = await prisma.user.findUnique({ where: { id: challenge.userId } });
        if (!user) return null;

        return { id: user.id, email: user.email };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
