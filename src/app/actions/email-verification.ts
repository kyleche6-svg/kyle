"use server";

import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendVerificationLink } from "@/lib/email";
import { checkGeneralLimit, checkLoginLimit, getRequestIp } from "@/lib/rate-limit";

const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export type ResendVerificationState = { message: string } | undefined;

export async function resendVerificationEmail(): Promise<ResendVerificationState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { message: "Not authenticated." };
  }

  const ip = await getRequestIp();
  // Same tight bound as password reset / login attempts — this sends a
  // real email per call, so it needs a hard ceiling, not just the general
  // per-IP limit.
  const { success } = await checkLoginLimit(`resend-verify:${session.user.id}:${ip}`);
  if (!success) {
    return { message: "Too many requests. Try again in 15 minutes." };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { message: "Not authenticated." };
  if (user.emailVerified) return { message: "Your email is already verified." };

  await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });
  await sendVerificationLink(user.id, user.email);

  return { message: "Verification email sent — check your inbox." };
}

export type VerifyEmailState = { message: string; success?: boolean } | undefined;

export async function verifyEmailToken(
  _state: VerifyEmailState,
  formData: FormData,
): Promise<VerifyEmailState> {
  const ip = await getRequestIp();
  const { success: withinLimit } = await checkGeneralLimit(`verify-email:${ip}`);
  if (!withinLimit) {
    return { message: "Too many attempts. Try again in 15 minutes." };
  }

  const token = String(formData.get("token") ?? "");
  const tokenHash = hashToken(token);

  const verificationToken = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
  if (!verificationToken || verificationToken.expiresAt < new Date()) {
    return { message: "This verification link is invalid or has expired." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: new Date() },
    }),
    prisma.emailVerificationToken.deleteMany({ where: { userId: verificationToken.userId } }),
  ]);

  return { message: "Email verified — thanks!", success: true };
}
