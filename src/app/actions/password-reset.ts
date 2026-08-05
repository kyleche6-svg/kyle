"use server";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkGeneralLimit, getRequestIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function getOrigin() {
  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export type RequestResetState = { message: string } | undefined;

export async function requestPasswordReset(
  _state: RequestResetState,
  formData: FormData,
): Promise<RequestResetState> {
  const ip = await getRequestIp();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  const { success } = await checkGeneralLimit(`reset-request:${ip}`);
  if (!success) {
    return { message: "Too many requests. Try again in 15 minutes." };
  }

  const turnstileOk = await verifyTurnstile(
    formData.get("cf-turnstile-response") as string | null,
    ip,
  );
  if (!turnstileOk) {
    return { message: "Bot verification failed. Please try again." };
  }

  // Generic response regardless of whether the account exists — same
  // no-enumeration principle as login/signup.
  const genericMessage = {
    message: "If an account exists for that email, a reset link has been sent.",
  };

  if (!email) return genericMessage;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return genericMessage;

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const origin = await getOrigin();
  const resetUrl = `${origin}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail(email, resetUrl);

  return genericMessage;
}

export type ResetPasswordState = { message: string } | undefined;

export async function resetPassword(
  _state: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const ip = await getRequestIp();
  const { success } = await checkGeneralLimit(`reset-confirm:${ip}`);
  if (!success) {
    return { message: "Too many attempts. Try again in 15 minutes." };
  }

  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");

  if (password.length < 8) {
    return { message: "Password must be at least 8 characters long." };
  }

  const tokenHash = hashToken(token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!resetToken || resetToken.expiresAt < new Date()) {
    return { message: "This reset link is invalid or has expired." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    // Invalidate every outstanding reset token for this user, not just the
    // one used — a stale second link shouldn't stay valid after a reset.
    prisma.passwordResetToken.deleteMany({
      where: { userId: resetToken.userId },
    }),
  ]);

  redirect("/login?reset=success");
}
