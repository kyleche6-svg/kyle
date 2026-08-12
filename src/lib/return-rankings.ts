import { TRENDING_TICKERS, getAnalystConsensus, getKeyStatistics } from "@/lib/stocks";
import { getHistoricalReturnFrequency, type ReturnFrequencyWindow } from "@/lib/historical-stats";
import type { AnalystConsensus, KeyStatistics } from "@/lib/stocks";

export type TickerRanking = {
  ticker: string;
  companyName: string;
  windows: ReturnFrequencyWindow[];
  consensus: AnalystConsensus;
  stats: KeyStatistics;
};

// Fans out to ~51 tickers, each pulling a real 800-point price series
// plus real analyst consensus and key statistics — all from the same
// data sources already used elsewhere in the app (Twelve Data primary,
// deterministic fallback if unavailable), so this ranking is grounded in
// the same real numbers a visitor would see on that ticker's own detail
// page, not separately fabricated for this view. Expensive to compute
// (3 real-data calls x 51 tickers), so cached for an hour rather than
// recomputed per request.
const CACHE_MS = 60 * 60 * 1000;
let cache: { computedAt: number; rankings: TickerRanking[] } | null = null;

export async function getReturnRankings(): Promise<TickerRanking[]> {
  if (cache && Date.now() - cache.computedAt < CACHE_MS) return cache.rankings;

  const rankings = await Promise.all(
    TRENDING_TICKERS.map(async (t) => {
      const [windows, consensus, stats] = await Promise.all([
        getHistoricalReturnFrequency(t.ticker, t.basePrice),
        getAnalystConsensus(t.ticker, t.basePrice),
        getKeyStatistics(t.ticker, t.basePrice),
      ]);
      return { ticker: t.ticker, companyName: t.companyName, windows, consensus, stats };
    }),
  );

  cache = { computedAt: Date.now(), rankings };
  return rankings;
}
