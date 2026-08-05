import { prisma } from "@/lib/prisma";

export async function getRecentTrades(limit = 50) {
  return prisma.trade.findMany({
    orderBy: { filedDate: "desc" },
    take: limit,
  });
}

export async function getMonthlyBuyLeaderboard(limit = 10) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const grouped = await prisma.trade.groupBy({
    by: ["ticker"],
    where: { direction: "buy", transactionDate: { gte: startOfMonth } },
    _count: { ticker: true },
    orderBy: { _count: { ticker: "desc" } },
    take: limit,
  });

  return grouped.map((row) => ({ ticker: row.ticker, buyCount: row._count.ticker }));
}
