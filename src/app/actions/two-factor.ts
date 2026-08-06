"use server";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth, signIn } from "@/lib/auth";
import { decryptSecret, encryptSecret, generateQrCodeDataUrl, generateTotpSecret, verifyTotpCode } from "@/lib/totp";
import { checkLoginLimit, getRequestIp } from "@/lib/rate-limit";

const CHALLENGE_COOKIE = "2fa_pending";
const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes — short-lived on purpose

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Step 1 of setup: generate a fresh TOTP secret and its QR code, but don't
// persist or enable anything yet — nothing is stored until the user proves
// they can generate a valid code from it in confirmTwoFactorSetup.
export async function startTwoFactorSetup(): Promise<
  { error: string } | { secret: string; qrCodeDataUrl: string }
> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return { error: "Not authenticated." };
  }

  const secret = generateTotpSecret();
  const qrCodeDataUrl = await generateQrCodeDataUrl(session.user.email, secret);
  return { secret, qrCodeDataUrl };
}

export type ConfirmTwoFactorState = { message: string; success?: boolean } | undefined;

export async function confirmTwoFactorSetup(
  _state: ConfirmTwoFactorState,
  formData: FormData,
): Promise<ConfirmTwoFactorState> {
  const session = await auth();
  if (!session?.user?.id) return { message: "Not authenticated." };

  const ip = await getRequestIp();
  const { success: withinLimit } = await checkLoginLimit(`2fa-confirm:${session.user.id}:${ip}`);
  if (!withinLimit) return { message: "Too many attempts. Try again in 15 minutes." };

  const secret = String(formData.get("secret") ?? "");
  const code = String(formData.get("code") ?? "").trim();

  if (!secret || !(await verifyTotpCode(code, secret))) {
    return { message: "That code didn't match. Check your authenticator app and try again." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { twoFactorEnabled: true, twoFactorSecret: encryptSecret(secret) },
  });

  return { message: "Two-factor authentication is now enabled.", success: true };
}

export type DisableTwoFactorState = { message: string } | undefined;

export async function disableTwoFactor(
  _state: DisableTwoFactorState,
  formData: FormData,
): Promise<DisableTwoFactorState> {
  const session = await auth();
  if (!session?.user?.id) return { message: "Not authenticated." };

  const ip = await getRequestIp();
  const { success: withinLimit } = await checkLoginLimit(`2fa-disable:${session.user.id}:${ip}`);
  if (!withinLimit) return { message: "Too many attempts. Try again in 15 minutes." };

  const password = String(formData.get("password") ?? "");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { message: "Not authenticated." };

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) return { message: "Incorrect password." };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });

  return { message: "Two-factor authentication has been disabled." };
}

// Called from the login action once the password has already checked out
// for a user with 2FA enabled — issues a short-lived, single-use challenge
// so step 2 (the code form) never needs the plaintext password again.
export async function issueTwoFactorChallenge(userId: string) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
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

export type VerifyTwoFactorState = { message: string } | undefined;

export async function verifyTwoFactorLogin(
  _state: VerifyTwoFactorState,
  formData: FormData,
): Promise<VerifyTwoFactorState> {
  const ip = await getRequestIp();
  const cookieStore = await cookies();
  const challengeToken = cookieStore.get(CHALLENGE_COOKIE)?.value;

  if (!challengeToken) {
    return { message: "Your login session expired. Please log in again." };
  }

  const tokenHash = hashToken(challengeToken);
  const challenge = await prisma.twoFactorChallenge.findUnique({ where: { tokenHash } });

  if (!challenge || challenge.expiresAt < new Date()) {
    cookieStore.delete(CHALLENGE_COOKIE);
    return { message: "Your login session expired. Please log in again." };
  }

  const { success: withinLimit } = await checkLoginLimit(`2fa-login:${challenge.userId}:${ip}`);
  if (!withinLimit) {
    return { message: "Too many attempts. Try again in 15 minutes." };
  }

  const user = await prisma.user.findUnique({ where: { id: challenge.userId } });
  if (!user?.twoFactorSecret) {
    return { message: "Two-factor authentication is not set up for this account." };
  }

  const code = String(formData.get("code") ?? "").trim();
  const validCode = await verifyTotpCode(code, decryptSecret(user.twoFactorSecret));
  if (!validCode) {
    return { message: "Invalid code. Please try again." };
  }

  // The "two-factor" provider's authorize() looks the challenge up by this
  // same token and consumes (deletes) it there — not here — since it's the
  // one actually establishing the session; consuming it earlier would make
  // that lookup fail.
  cookieStore.delete(CHALLENGE_COOKIE);

  await signIn("two-factor", { challengeToken, redirect: false });
  redirect("/dashboard");
}
