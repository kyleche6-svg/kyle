import { getSeries, type SeriesPoint } from "@/lib/market-data";
import type { RealTrade } from "@/lib/real-trades";

export type PerformanceComparison = {
  positionsAnalyzed: number;
  positionsSkipped: number;
  weightedReturn: number | null;
  spyWeightedReturn: number | null;
  asOfDate: string;
};

const MAX_POSITIONS = 8;
const LOOKBACK_BARS = 5000; // ~20 years of daily bars — covers this app's full trade history

function findPriceOnOrAfter(series: SeriesPoint[], date: Date): number | null {
  const target = date.getTime();
  const point = series.find((p) => new Date(p.date).getTime() >= target);
  return point?.value ?? series[series.length - 1]?.value ?? null;
}

// A dollar-weighted, backward-looking estimate: "if the disclosed buys had
// been held from their earliest purchase date to today, how would that
// compare to holding the S&P 500 (SPY) over the same entry dates?" This
// ignores sells, position sizing beyond the disclosed amount midpoint, fees,
// and taxes — it is a rough historical estimate, not a claim about the
// politician's actual current holdings or realized returns, and never a
// forward-looking signal (same hard constraint as the rest of this app).
export async function getPoliticianPerformance(trades: RealTrade[]): Promise<PerformanceComparison> {
  const buys = trades.filter((t) => t.direction === "buy");
  const byTicker = new Map<string, { ticker: string; earliestDate: Date; amount: number }>();

  for (const trade of buys) {
    const midpoint = (trade.amountRangeLow + trade.amountRangeHigh) / 2;
    const existing = byTicker.get(trade.ticker);
    if (existing) {
      existing.amount += midpoint;
      if (trade.transactionDate < existing.earliestDate) existing.earliestDate = trade.transactionDate;
    } else {
      byTicker.set(trade.ticker, { ticker: trade.ticker, earliestDate: trade.transactionDate, amount: midpoint });
    }
  }

  const positions = Array.from(byTicker.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, MAX_POSITIONS);

  if (positions.length === 0) {
    return { positionsAnalyzed: 0, positionsSkipped: 0, weightedReturn: null, spyWeightedReturn: null, asOfDate: new Date().toISOString() };
  }

  const spySeries = await getSeries("SPY", 400, LOOKBACK_BARS);

  let weightedReturnSum = 0;
  let spyWeightedReturnSum = 0;
  let totalWeight = 0;
  let skipped = 0;

  await Promise.all(
    positions.map(async (position) => {
      const series = await getSeries(position.ticker, 100, LOOKBACK_BARS);
      const entryPrice = findPriceOnOrAfter(series, position.earliestDate);
      const currentPrice = series[series.length - 1]?.value ?? null;
      const spyEntryPrice = findPriceOnOrAfter(spySeries, position.earliestDate);
      const spyCurrentPrice = spySeries[spySeries.length - 1]?.value ?? null;

      if (!entryPrice || !currentPrice || !spyEntryPrice || !spyCurrentPrice) {
        skipped += 1;
        return;
      }

      const stockReturn = currentPrice / entryPrice - 1;
      const spyReturn = spyCurrentPrice / spyEntryPrice - 1;

      weightedReturnSum += stockReturn * position.amount;
      spyWeightedReturnSum += spyReturn * position.amount;
      totalWeight += position.amount;
    }),
  );

  return {
    positionsAnalyzed: totalWeight > 0 ? positions.length - skipped : 0,
    positionsSkipped: skipped,
    weightedReturn: totalWeight > 0 ? weightedReturnSum / totalWeight : null,
    spyWeightedReturn: totalWeight > 0 ? spyWeightedReturnSum / totalWeight : null,
    asOfDate: new Date().toISOString(),
  };
}
