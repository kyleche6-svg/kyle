import { seededRandom } from "@/lib/market-data";
import { TRENDING_TICKERS } from "@/lib/stocks";

export type UpcomingEarnings = {
  ticker: string;
  companyName: string;
  estimatedDate: Date;
  epsEstimate: number | null;
};

async function twelveDataNextEarnings(ticker: string): Promise<{ date: Date; epsEstimate: number | null } | null> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.twelvedata.com/earnings?symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`,
      { next: { revalidate: 43200 } },
    );
    const data = await res.json();
    if (data.code || !Array.isArray(data.earnings) || data.earnings.length === 0) return null;

    const latest = data.earnings[0] as { date: string; eps_estimate?: string };
    const latestDate = new Date(latest.date);
    if (Number.isNaN(latestDate.getTime())) return null;

    // Twelve Data's most recent entry is often the last reported quarter,
    // not a forward estimate — project the next quarterly report ~91 days
    // out (standard cadence) when the entry is already in the past.
    const estimatedDate =
      latestDate.getTime() > Date.now() ? latestDate : new Date(latestDate.getTime() + 91 * 24 * 60 * 60 * 1000);

    return {
      date: estimatedDate,
      epsEstimate: latest.eps_estimate ? parseFloat(latest.eps_estimate) : null,
    };
  } catch {
    return null;
  }
}

function mockNextEarnings(ticker: string): { date: Date; epsEstimate: number | null } {
  const daysOut = Math.floor(seededRandom(`next-earnings:${ticker}`) * 60);
  const date = new Date(Date.now() + daysOut * 24 * 60 * 60 * 1000);
  const epsEstimate = 1 + seededRandom(`next-eps:${ticker}`) * 3;
  return { date, epsEstimate: Math.round(epsEstimate * 100) / 100 };
}

// Same fan-out cost problem as getStockList — ~50 tickers, one external
// call each, on every single page view. Cached in-process for 30 minutes
// (real earnings-date estimates don't shift minute to minute).
const EARNINGS_CACHE_MS = 30 * 60 * 1000;
let earningsCache: { computedAt: number; list: UpcomingEarnings[] } | null = null;

export async function getUpcomingEarnings(): Promise<UpcomingEarnings[]> {
  if (earningsCache && Date.now() - earningsCache.computedAt < EARNINGS_CACHE_MS) {
    return earningsCache.list;
  }

  const results = await Promise.all(
    TRENDING_TICKERS.map(async (t) => {
      const real = await twelveDataNextEarnings(t.ticker);
      const { date, epsEstimate } = real ?? mockNextEarnings(t.ticker);
      return { ticker: t.ticker, companyName: t.companyName, estimatedDate: date, epsEstimate };
    }),
  );

  const list = results.sort((a, b) => a.estimatedDate.getTime() - b.estimatedDate.getTime());
  earningsCache = { computedAt: Date.now(), list };
  return list;
}
