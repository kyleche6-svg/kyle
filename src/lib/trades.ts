import { prisma } from "@/lib/prisma";

export async function getRecentTrades(limit = 50) {
  return prisma.trade.findMany({
    orderBy: { filedDate: "desc" },
    take: limit,
  });
}

export async function getPoliticianTrades(politicianName: string) {
  return prisma.trade.findMany({
    where: { politicianName },
    orderBy: { filedDate: "desc" },
  });
}

export async function getPoliticianPortfolio(politicianName: string) {
  const trades = await prisma.trade.findMany({ where: { politicianName } });

  const byTicker = new Map<
    string,
    { ticker: string; buyTotal: number; sellTotal: number; buyCount: number; sellCount: number }
  >();

  for (const trade of trades) {
    const midpoint = (trade.amountRangeLow + trade.amountRangeHigh) / 2;
    const existing = byTicker.get(trade.ticker) ?? {
      ticker: trade.ticker,
      buyTotal: 0,
      sellTotal: 0,
      buyCount: 0,
      sellCount: 0,
    };

    if (trade.direction === "buy") {
      existing.buyTotal += midpoint;
      existing.buyCount += 1;
    } else {
      existing.sellTotal += midpoint;
      existing.sellCount += 1;
    }
    byTicker.set(trade.ticker, existing);
  }

  return Array.from(byTicker.values())
    .map((row) => ({ ...row, netEstimate: row.buyTotal - row.sellTotal }))
    .sort((a, b) => Math.abs(b.netEstimate) - Math.abs(a.netEstimate));
}

export async function getAllPoliticians() {
  const grouped = await prisma.trade.groupBy({
    by: ["politicianName"],
    _count: { politicianName: true },
    orderBy: { politicianName: "asc" },
  });

  return grouped.map((row) => ({ name: row.politicianName, tradeCount: row._count.politicianName }));
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
