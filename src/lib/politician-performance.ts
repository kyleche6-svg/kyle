import { getSeries, type SeriesPoint } from "@/lib/market-data";
import { buildHistogram, type HistogramBucket } from "@/lib/historical-stats";
import type { RealTrade } from "@/lib/real-trades";

export type PositionReturn = { ticker: string; amount: number; stockReturn: number; spyReturn: number };
export type TrendPoint = { date: string; portfolioIndex: number; spyIndex: number };

export type PerformanceComparison = {
  positionsAnalyzed: number;
  positionsSkipped: number;
  weightedReturn: number | null;
  spyWeightedReturn: number | null;
  positions: PositionReturn[];
  histogram: HistogramBucket[];
  trend: TrendPoint[];
  asOfDate: string;
};

const MAX_POSITIONS = 8;
const LOOKBACK_BARS = 5000; // ~20 years of daily bars — covers this app's full trade history

function findPriceOnOrAfter(series: SeriesPoint[], date: Date): number | null {
  const target = date.getTime();
  const point = series.find((p) => new Date(p.date).getTime() >= target);
  return point?.value ?? series[series.length - 1]?.value ?? null;
}

// Latest known price at or before the given date — used to snapshot a
// series on a shared monthly timeline for the trendline chart, since
// different tickers rarely share exact trading-day dates.
function findPriceOnOrBefore(series: SeriesPoint[], date: Date): number | null {
  const target = date.getTime();
  let result: number | null = null;
  for (const point of series) {
    const t = new Date(point.date).getTime();
    if (t > target) break;
    result = point.value;
  }
  return result ?? series[0]?.value ?? null;
}

function monthlySnapshotDates(from: Date, to: Date): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  while (cursor <= to) {
    dates.push(new Date(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  dates.push(to);
  return dates;
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
    return {
      positionsAnalyzed: 0,
      positionsSkipped: 0,
      weightedReturn: null,
      spyWeightedReturn: null,
      positions: [],
      histogram: [],
      trend: [],
      asOfDate: new Date().toISOString(),
    };
  }

  const spySeries = await getSeries("SPY", 400, LOOKBACK_BARS);

  const results: PositionReturn[] = [];
  const activePositions: { ticker: string; amount: number; earliestDate: Date; series: SeriesPoint[]; entryPrice: number }[] = [];
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

      results.push({
        ticker: position.ticker,
        amount: position.amount,
        stockReturn: currentPrice / entryPrice - 1,
        spyReturn: spyCurrentPrice / spyEntryPrice - 1,
      });
      activePositions.push({ ticker: position.ticker, amount: position.amount, earliestDate: position.earliestDate, series, entryPrice });
    }),
  );

  const totalWeight = results.reduce((sum, r) => sum + r.amount, 0);
  const weightedReturn =
    totalWeight > 0 ? results.reduce((sum, r) => sum + r.stockReturn * r.amount, 0) / totalWeight : null;
  const spyWeightedReturn =
    totalWeight > 0 ? results.reduce((sum, r) => sum + r.spyReturn * r.amount, 0) / totalWeight : null;

  const sortedReturns = results.map((r) => r.stockReturn).sort((a, b) => a - b);

  const trend: TrendPoint[] = [];
  if (activePositions.length > 0) {
    const overallEarliest = activePositions.reduce(
      (min, p) => (p.earliestDate < min ? p.earliestDate : min),
      activePositions[0].earliestDate,
    );
    const spyBasePrice = findPriceOnOrAfter(spySeries, overallEarliest) ?? spySeries[0]?.value ?? 1;
    const snapshots = monthlySnapshotDates(overallEarliest, new Date());

    for (const snapshotDate of snapshots) {
      const active = activePositions.filter((p) => p.earliestDate <= snapshotDate);
      if (active.length === 0) continue;

      const activeWeight = active.reduce((sum, p) => sum + p.amount, 0);
      const portfolioIndex =
        active.reduce((sum, p) => {
          const price = findPriceOnOrBefore(p.series, snapshotDate);
          const ratio = price && p.entryPrice ? price / p.entryPrice : 1;
          return sum + ratio * 100 * p.amount;
        }, 0) / activeWeight;

      const spyPrice = findPriceOnOrBefore(spySeries, snapshotDate);
      const spyIndex = spyPrice ? (spyPrice / spyBasePrice) * 100 : 100;

      trend.push({ date: snapshotDate.toISOString().slice(0, 10), portfolioIndex, spyIndex });
    }
  }

  return {
    positionsAnalyzed: results.length,
    positionsSkipped: skipped,
    weightedReturn,
    spyWeightedReturn,
    positions: results.sort((a, b) => b.amount - a.amount),
    histogram: sortedReturns.length > 1 ? buildHistogram(sortedReturns, Math.min(6, sortedReturns.length)) : [],
    trend,
    asOfDate: new Date().toISOString(),
  };
}
