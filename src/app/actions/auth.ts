"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import { signIn, signOut, auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { SignupFormSchema, type SignupFormState } from "@/lib/definitions";
import { checkGeneralLimit, checkLoginLimit, getRequestIp } from "@/lib/rate-limit";

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
  await prisma.user.create({ data: { email, passwordHash } });

  await signIn("credentials", { email, password, redirect: false });
  redirect("/pricing");
}

export type LoginFormState = { message?: string } | undefined;

export async function login(_state: LoginFormState, formData: FormData) {
  const ip = await getRequestIp();
  const email = String(formData.get("email") ?? "unknown");

  const { success } = await checkLoginLimit(`${ip}:${email}`);
  if (!success) {
    logRateLimitViolation({ type: "login", ip, email });
    return { message: "Too many login attempts. Try again in 15 minutes." };
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
