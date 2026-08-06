import { prisma } from "@/lib/prisma";

export type RealTrade = {
  id: string;
  politicianName: string;
  ticker: string;
  direction: "buy" | "sell";
  amountRangeLow: number;
  amountRangeHigh: number;
  transactionDate: Date;
  filedDate: Date;
  ptrLink: string;
};

// Real US Senate stock-trade disclosures, sourced live from
// efdsearch.senate.gov (the Senate's own financial disclosure search
// system) via scripts/scrape-senate-trades.mjs — see src/lib/senate-scraper.ts
// for the scraping pipeline itself. Senate only — no equivalent free,
// reliable House feed exists (House Stock Watcher's public data was down at
// integration time). Run the scraper periodically to keep this current;
// data here is only as fresh as the last run.
function toRealTrade(row: {
  id: string;
  politicianName: string;
  ticker: string;
  direction: string;
  amountRangeLow: number;
  amountRangeHigh: number;
  transactionDate: Date;
  filedDate: Date;
  ptrLink: string | null;
}): RealTrade {
  return {
    id: row.id,
    politicianName: row.politicianName,
    ticker: row.ticker,
    direction: row.direction as "buy" | "sell",
    amountRangeLow: row.amountRangeLow,
    amountRangeHigh: row.amountRangeHigh,
    transactionDate: row.transactionDate,
    filedDate: row.filedDate,
    ptrLink: row.ptrLink ?? "",
  };
}

export async function getRecentRealTrades(limit = 50): Promise<RealTrade[]> {
  const rows = await prisma.trade.findMany({
    orderBy: { filedDate: "desc" },
    take: limit,
  });
  return rows.map(toRealTrade);
}

export async function getRealTradesForPolitician(politicianName: string): Promise<RealTrade[]> {
  const rows = await prisma.trade.findMany({
    where: { politicianName },
    orderBy: { transactionDate: "desc" },
  });
  return rows.map(toRealTrade);
}

export async function getAllRealPoliticians(): Promise<{ name: string; tradeCount: number }[]> {
  const grouped = await prisma.trade.groupBy({
    by: ["politicianName"],
    _count: { politicianName: true },
    orderBy: { politicianName: "asc" },
  });
  return grouped.map((row) => ({ name: row.politicianName, tradeCount: row._count.politicianName }));
}

export async function getRealMonthlyBuyLeaderboard(limit = 10): Promise<{ ticker: string; buyCount: number }[]> {
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const grouped = await prisma.trade.groupBy({
    by: ["ticker"],
    where: { direction: "buy", transactionDate: { gte: startOfMonth } },
    _count: { ticker: true },
    orderBy: { _count: { ticker: "desc" } },
    take: limit,
  });

  return grouped.map((row) => ({ ticker: row.ticker, buyCount: row._count.ticker }));
}

export function getRealPoliticianPortfolio(trades: RealTrade[]) {
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
