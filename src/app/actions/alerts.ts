"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkGeneralLimit, getRequestIp } from "@/lib/rate-limit";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated.");
  return session.user.id;
}

export type CreateAlertState = { message?: string } | undefined;

export async function createPriceAlert(
  _state: CreateAlertState,
  formData: FormData,
): Promise<CreateAlertState> {
  const userId = await requireUserId();
  const ip = await getRequestIp();
  const { success } = await checkGeneralLimit(`alert-create:${userId}:${ip}`);
  if (!success) return { message: "Too many requests. Slow down and try again shortly." };

  const ticker = String(formData.get("ticker") ?? "").trim().toUpperCase();
  const targetPrice = parseFloat(String(formData.get("targetPrice") ?? ""));
  const direction = String(formData.get("direction") ?? "");

  if (!/^[A-Z.]{1,6}$/.test(ticker)) return { message: "Invalid ticker." };
  if (!Number.isFinite(targetPrice) || targetPrice <= 0) return { message: "Enter a valid target price." };
  if (direction !== "above" && direction !== "below") return { message: "Invalid direction." };

  await prisma.priceAlert.create({
    data: { userId, ticker, targetPrice, direction },
  });

  revalidatePath("/watchlist");
  return { message: "Alert created." };
}

export async function deletePriceAlert(id: string) {
  const userId = await requireUserId();
  await prisma.priceAlert.deleteMany({ where: { id, userId } });
  revalidatePath("/watchlist");
}
