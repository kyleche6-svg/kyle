"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkGeneralLimit, getRequestIp } from "@/lib/rate-limit";

export type UpdateProfileState = { message?: string; success?: boolean } | undefined;

export async function updateProfile(
  _state: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { message: "Not authenticated." };
  }

  const ip = await getRequestIp();
  const { success: withinLimit } = await checkGeneralLimit(session.user.id ?? ip);
  if (!withinLimit) {
    return { message: "Too many requests. Slow down and try again shortly." };
  }

  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 30);

  if (phone && !/^[+\d][\d\s()-]{6,29}$/.test(phone)) {
    return { message: "That doesn't look like a valid phone number." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: name || null, phone: phone || null },
  });

  revalidatePath("/account");
  return { success: true, message: "Profile updated." };
}
