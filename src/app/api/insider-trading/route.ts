import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInsiderTradesPage, getOwnerTradesPage } from "@/lib/insider-trading";
import { checkGeneralLimit, getRequestIp } from "@/lib/rate-limit";

const PAGE_SIZE = 15;

// Backs both the main insider-trading list's "Load more" and the
// per-insider detail page's "Load more" — same gating as every other
// stock-data endpoint (session + active subscription + rate limit).
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const subscription = await prisma.subscription.findUnique({ where: { userId: session.user.id } });
  if (subscription?.status !== "active") {
    return NextResponse.json({ error: "Active subscription required." }, { status: 403 });
  }

  const ip = await getRequestIp();
  const { success } = await checkGeneralLimit(`insider-trading-api:${session.user.id}:${ip}`);
  if (!success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const params = req.nextUrl.searchParams;
  const offset = Math.max(0, parseInt(params.get("offset") ?? "0", 10) || 0);
  const owner = params.get("owner");
  const search = params.get("search")?.trim() || undefined;

  const page = owner
    ? await getOwnerTradesPage(owner, { limit: PAGE_SIZE, offset })
    : await getInsiderTradesPage({ limit: PAGE_SIZE, offset, search });

  return NextResponse.json(page);
}
