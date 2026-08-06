import crypto from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const CHALLENGE_COOKIE = "2fa_pending";
const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes — short-lived on purpose

export function hashChallengeToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Deliberately NOT exported from a "use server" action file. Every export
// in one of those becomes a directly RPC-callable action regardless of
// whether it's wired to a form — and this takes a raw userId with no
// authorization check of its own. It must only ever run after login()
// (src/app/actions/auth.ts) has already verified that user's password;
// if this were reachable directly, anyone could mint a 2FA challenge for
// any account without knowing its password, skipping straight to
// brute-forcing the TOTP code.
export async function issueTwoFactorChallenge(userId: string) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashChallengeToken(rawToken);
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

  await prisma.twoFactorChallenge.deleteMany({ where: { userId } });
  await prisma.twoFactorChallenge.create({ data: { userId, tokenHash, expiresAt } });

  const cookieStore = await cookies();
  cookieStore.set(CHALLENGE_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: CHALLENGE_TTL_MS / 1000,
    path: "/",
  });
}

export { CHALLENGE_COOKIE };
