import { getSeries, type SeriesPoint } from "@/lib/market-data";

export type HistogramBucket = { rangeLabel: string; rangeMid: number; count: number; frequency: number };

export type ReturnFrequencyWindow = {
  label: string;
  tradingDays: number;
  sampleCount: number;
  positiveFrequency: number | null;
  mean: number | null;
  median: number | null;
  stdDev: number | null;
  min: number | null;
  max: number | null;
  p10: number | null;
  p90: number | null;
  histogram: HistogramBucket[];
};

const WINDOWS = [
  { label: "1 month", tradingDays: 21 },
  { label: "3 months", tradingDays: 63 },
  { label: "6 months", tradingDays: 126 },
  { label: "1 year", tradingDays: 252 },
];

const EMPTY_STATS = {
  sampleCount: 0,
  positiveFrequency: null,
  mean: null,
  median: null,
  stdDev: null,
  min: null,
  max: null,
  p10: null,
  p90: null,
  histogram: [] as HistogramBucket[],
};

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stdDev(values: number[], avg: number): number {
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function percentile(sorted: number[], p: number): number {
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// A histogram over realized returns is an empirical probability
// distribution — how the actual outcomes were spread out — not a model of
// future odds.
function buildHistogram(sorted: number[], buckets = 10): HistogramBucket[] {
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const span = max - min || 1;
  const width = span / buckets;

  const counts = new Array(buckets).fill(0);
  for (const v of sorted) {
    const i = Math.min(buckets - 1, Math.floor((v - min) / width));
    counts[i] += 1;
  }

  return counts.map((count, i) => {
    const rangeStart = min + i * width;
    const rangeEnd = rangeStart + width;
    return {
      rangeLabel: `${(rangeStart * 100).toFixed(0)}% to ${(rangeEnd * 100).toFixed(0)}%`,
      rangeMid: (rangeStart + rangeEnd) / 2,
      count,
      frequency: count / sorted.length,
    };
  });
}

// Backward-looking only: the empirical distribution (mean, spread,
// percentiles, histogram) of what actually happened across rolling windows
// of this length in real price history. Standard descriptive statistics
// applied to past outcomes — never a model of, or claim about, future odds
// of profit (a hard product constraint, see PRODUCT.md Product Principles #1).
function computeReturnFrequency(series: SeriesPoint[]): ReturnFrequencyWindow[] {
  return WINDOWS.map(({ label, tradingDays }) => {
    if (series.length < tradingDays + 2) {
      return { label, tradingDays, ...EMPTY_STATS };
    }

    const returns: number[] = [];
    for (let i = 0; i + tradingDays < series.length; i++) {
      const start = series[i].value;
      const end = series[i + tradingDays].value;
      if (start > 0) returns.push(end / start - 1);
    }

    if (returns.length === 0) {
      return { label, tradingDays, ...EMPTY_STATS };
    }

    const sorted = [...returns].sort((a, b) => a - b);
    const avg = mean(returns);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[(sorted.length - 1) / 2];

    return {
      label,
      tradingDays,
      sampleCount: returns.length,
      positiveFrequency: returns.filter((r) => r > 0).length / returns.length,
      mean: avg,
      median,
      stdDev: stdDev(returns, avg),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p10: percentile(sorted, 0.1),
      p90: percentile(sorted, 0.9),
      histogram: buildHistogram(sorted),
    };
  });
}

export async function getHistoricalReturnFrequency(
  ticker: string,
  basePrice: number,
): Promise<ReturnFrequencyWindow[]> {
  const series = await getSeries(ticker, basePrice, 800);
  return computeReturnFrequency(series);
}
