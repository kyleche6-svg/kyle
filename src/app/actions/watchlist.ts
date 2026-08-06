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

export async function addToWatchlist(ticker: string) {
  const userId = await requireUserId();
  const ip = await getRequestIp();
  const { success } = await checkGeneralLimit(`watchlist:${userId}:${ip}`);
  if (!success) return { message: "Too many requests. Slow down and try again shortly." };

  const normalized = ticker.trim().toUpperCase();
  if (!/^[A-Z.]{1,6}$/.test(normalized)) return { message: "Invalid ticker." };

  await prisma.watchlistItem.upsert({
    where: { userId_ticker: { userId, ticker: normalized } },
    create: { userId, ticker: normalized },
    update: {},
  });

  revalidatePath("/watchlist");
  return { success: true };
}

export async function removeFromWatchlist(id: string) {
  const userId = await requireUserId();
  await prisma.watchlistItem.deleteMany({ where: { id, userId } });
  revalidatePath("/watchlist");
}
