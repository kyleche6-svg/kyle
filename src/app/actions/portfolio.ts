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

export type AddHoldingState = { message?: string } | undefined;

export async function addPortfolioHolding(
  _state: AddHoldingState,
  formData: FormData,
): Promise<AddHoldingState> {
  const userId = await requireUserId();
  const ip = await getRequestIp();
  const { success } = await checkGeneralLimit(`portfolio-add:${userId}:${ip}`);
  if (!success) return { message: "Too many requests. Slow down and try again shortly." };

  const ticker = String(formData.get("ticker") ?? "").trim().toUpperCase();
  const shares = parseFloat(String(formData.get("shares") ?? ""));
  const costBasis = parseFloat(String(formData.get("costBasis") ?? ""));

  if (!/^[A-Z.]{1,6}$/.test(ticker)) return { message: "Invalid ticker." };
  if (!Number.isFinite(shares) || shares <= 0) return { message: "Enter a valid number of shares." };
  if (!Number.isFinite(costBasis) || costBasis <= 0) return { message: "Enter a valid cost per share." };

  await prisma.portfolioHolding.create({
    data: { userId, ticker, shares, costBasis },
  });

  revalidatePath("/portfolio");
  return { message: "Holding added." };
}

export async function deletePortfolioHolding(id: string) {
  const userId = await requireUserId();
  await prisma.portfolioHolding.deleteMany({ where: { id, userId } });
  revalidatePath("/portfolio");
}
