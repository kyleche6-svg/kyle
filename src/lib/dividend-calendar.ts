import { seededRandom } from "@/lib/market-data";
import { TRENDING_TICKERS } from "@/lib/stocks";

export type UpcomingDividend = {
  ticker: string;
  companyName: string;
  exDate: Date;
  amount: number;
};

async function twelveDataNextDividend(ticker: string): Promise<{ exDate: Date; amount: number } | null> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.twelvedata.com/dividends?symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`,
      { next: { revalidate: 43200 } },
    );
    const data = await res.json();
    if (data.code || !Array.isArray(data.dividends) || data.dividends.length === 0) return null;

    const latest = data.dividends[0] as { ex_date: string; amount: string };
    const latestDate = new Date(latest.ex_date);
    if (Number.isNaN(latestDate.getTime())) return null;

    const exDate =
      latestDate.getTime() > Date.now() ? latestDate : new Date(latestDate.getTime() + 91 * 24 * 60 * 60 * 1000);

    return { exDate, amount: parseFloat(latest.amount) };
  } catch {
    return null;
  }
}

function mockNextDividend(ticker: string): { exDate: Date; amount: number } | null {
  // Not every company pays a dividend — deterministically skip ~35% of
  // tickers rather than inventing a payout for every one.
  if (seededRandom(`pays-dividend:${ticker}`) < 0.35) return null;

  const daysOut = Math.floor(seededRandom(`next-div:${ticker}`) * 90);
  const exDate = new Date(Date.now() + daysOut * 24 * 60 * 60 * 1000);
  const amount = 0.2 + seededRandom(`div-amount:${ticker}`) * 1.5;
  return { exDate, amount: Math.round(amount * 100) / 100 };
}

export async function getUpcomingDividends(): Promise<UpcomingDividend[]> {
  const results = await Promise.all(
    TRENDING_TICKERS.map(async (t) => {
      const real = await twelveDataNextDividend(t.ticker);
      const resolved = real ?? mockNextDividend(t.ticker);
      if (!resolved) return null;
      return { ticker: t.ticker, companyName: t.companyName, exDate: resolved.exDate, amount: resolved.amount };
    }),
  );

  return results
    .filter((r): r is UpcomingDividend => r !== null)
    .sort((a, b) => a.exDate.getTime() - b.exDate.getTime());
}
