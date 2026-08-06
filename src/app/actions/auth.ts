"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import { signIn, signOut, auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { SignupFormSchema, type SignupFormState } from "@/lib/definitions";
import { checkGeneralLimit, checkLoginLimit, getRequestIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { sendVerificationLink } from "@/lib/email";
import { issueTwoFactorChallenge } from "@/lib/two-factor-challenge";

function logRateLimitViolation(details: Record<string, string>) {
  console.warn(JSON.stringify({ event: "rate_limit_violation", ...details }));
}

export async function signup(_state: SignupFormState, formData: FormData) {
  const ip = await getRequestIp();
  const { success } = await checkGeneralLimit(`signup:${ip}`);
  if (!success) {
    logRateLimitViolation({ type: "signup", ip });
    return { message: "Too many attempts. Try again in 15 minutes." };
  }

  const turnstileOk = await verifyTurnstile(
    formData.get("cf-turnstile-response") as string | null,
    ip,
  );
  if (!turnstileOk) {
    return { message: "Bot verification failed. Please try again." };
  }

  const validatedFields = SignupFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { email, password } = validatedFields.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    // Generic on purpose — a distinct "already exists" message lets an
    // attacker enumerate registered emails.
    return {
      message:
        "Something went wrong creating your account. If you already have one, try logging in instead.",
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, passwordHash } });
  await sendVerificationLink(user.id, user.email);

  await signIn("credentials", { email, password, redirect: false });
  redirect("/pricing");
}

export type LoginFormState = { message?: string; requiresTwoFactor?: boolean } | undefined;

export async function login(_state: LoginFormState, formData: FormData) {
  const ip = await getRequestIp();
  const email = String(formData.get("email") ?? "unknown");
  const password = String(formData.get("password") ?? "");

  const { success } = await checkLoginLimit(`${ip}:${email}`);
  if (!success) {
    logRateLimitViolation({ type: "login", ip, email });
    return { message: "Too many login attempts. Try again in 15 minutes." };
  }

  const turnstileOk = await verifyTurnstile(
    formData.get("cf-turnstile-response") as string | null,
    ip,
  );
  if (!turnstileOk) {
    return { message: "Bot verification failed. Please try again." };
  }

  // Checked here (server-side, before any session is established) rather
  // than relying on the credentials provider alone — that lets a 2FA-enabled
  // account be routed into the code-entry step instead of getting a session
  // immediately on password alone.
  const user = await prisma.user.findUnique({ where: { email } });
  if (user?.twoFactorEnabled) {
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return { message: "Invalid email or password." };
    }
    await issueTwoFactorChallenge(user.id);
    return { requiresTwoFactor: true };
  }

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { message: "Invalid email or password." };
    }
    throw error;
  }

  redirect("/dashboard");
}

export async function logout() {
  await signOut({ redirect: false });
  redirect("/");
}

export async function deleteAccount() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });

  if (subscription?.stripeSubscriptionId) {
    try {
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
    } catch {
      // Already canceled or Stripe unreachable — don't block account
      // deletion on a billing-side cleanup failure.
    }
  }

  // Subscription row cascades on User delete (see schema.prisma onDelete:
  // Cascade), so deleting User is sufficient.
  await prisma.user.delete({ where: { id: session.user.id } });

  await signOut({ redirect: false });
  redirect("/");
}
