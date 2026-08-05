"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import { signIn, signOut } from "@/lib/auth";
import { SignupFormSchema, type SignupFormState } from "@/lib/definitions";

export async function signup(_state: SignupFormState, formData: FormData) {
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
    return { message: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { email, passwordHash } });

  await signIn("credentials", { email, password, redirect: false });
  redirect("/pricing");
}

export type LoginFormState = { message?: string } | undefined;

export async function login(_state: LoginFormState, formData: FormData) {
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
