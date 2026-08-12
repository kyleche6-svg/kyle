import { TRENDING_TICKERS } from "@/lib/stocks";
import { getHistoricalReturnFrequency, type ReturnFrequencyWindow } from "@/lib/historical-stats";

export type TickerRanking = {
  ticker: string;
  companyName: string;
  windows: ReturnFrequencyWindow[];
};

// Fans out to ~51 tickers, each pulling an 800-point price series to
// compute real historical return statistics — expensive both in Twelve
// Data quota and compute, so cached for an hour rather than recomputed
// per request (same reasoning as the other list fan-outs in this app:
// getStockList, getTickerSectors, etc.).
const CACHE_MS = 60 * 60 * 1000;
let cache: { computedAt: number; rankings: TickerRanking[] } | null = null;

export async function getReturnRankings(): Promise<TickerRanking[]> {
  if (cache && Date.now() - cache.computedAt < CACHE_MS) return cache.rankings;

  const rankings = await Promise.all(
    TRENDING_TICKERS.map(async (t) => ({
      ticker: t.ticker,
      companyName: t.companyName,
      windows: await getHistoricalReturnFrequency(t.ticker, t.basePrice),
    })),
  );

  cache = { computedAt: Date.now(), rankings };
  return rankings;
}
