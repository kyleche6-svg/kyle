export type Quote = {
  symbol: string;
  label: string;
  price: number;
  changePercent: number;
};

export type SeriesPoint = { date: string; value: number };

export const CURRENCY_PAIRS = [
  { symbol: "EUR/USD", label: "EUR", basePrice: 1.08 },
  { symbol: "USD/JPY", label: "JPY", basePrice: 151.2 },
  { symbol: "GBP/USD", label: "GBP", basePrice: 1.27 },
  { symbol: "USD/CNY", label: "CNY", basePrice: 7.24 },
];

export const COMMODITIES = [
  { symbol: "XAU/USD", label: "Gold", basePrice: 2380 },
  { symbol: "WTI/USD", label: "Oil (WTI)", basePrice: 78 },
  { symbol: "XAG/USD", label: "Silver", basePrice: 28.5 },
];

const CACHE_SECONDS = 300; // refresh on an interval, not per-request

// Deterministic pseudo-random so mock values stay stable within a day
// (varies across days so a demo doesn't look frozen), rather than jumping
// on every render.
export function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

function daySeed(symbol: string) {
  const today = new Date().toISOString().slice(0, 10);
  return `${symbol}:${today}`;
}

function mockQuote(symbol: string, label: string, basePrice: number): Quote {
  const rand = seededRandom(daySeed(symbol));
  const changePercent = (rand - 0.5) * 2; // -1% to +1%
  const price = basePrice * (1 + changePercent / 100);
  return { symbol, label, price, changePercent };
}

function mockSeries(basePrice: number, seedKey: string, points = 30): SeriesPoint[] {
  const series: SeriesPoint[] = [];
  let value = basePrice * 0.99;
  for (let i = points - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const rand = seededRandom(`${seedKey}:${date.toISOString().slice(0, 10)}`);
    value = value * (1 + (rand - 0.5) * 0.03);
    series.push({ date: date.toISOString().slice(0, 10), value });
  }
  return series;
}

async function twelveDataQuote(
  symbol: string,
  label: string,
): Promise<Quote | null> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`,
      { next: { revalidate: CACHE_SECONDS } },
    );
    const data = await res.json();
    if (data.code || !data.close) return null;

    return {
      symbol,
      label,
      price: parseFloat(data.close),
      changePercent: parseFloat(data.percent_change ?? "0"),
    };
  } catch {
    return null;
  }
}

export async function getQuote(
  symbol: string,
  label: string,
  basePrice: number,
): Promise<Quote> {
  const real = await twelveDataQuote(symbol, label);
  return real ?? mockQuote(symbol, label, basePrice);
}

async function twelveDataSeries(
  symbol: string,
  points = 30,
): Promise<SeriesPoint[] | null> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=1day&outputsize=${points}&apikey=${apiKey}`,
      { next: { revalidate: CACHE_SECONDS } },
    );
    const data = await res.json();
    if (data.code || !Array.isArray(data.values)) return null;

    return data.values
      .map((v: { datetime: string; close: string }) => ({
        date: v.datetime,
        value: parseFloat(v.close),
      }))
      .reverse();
  } catch {
    return null;
  }
}

export async function getSeries(
  symbol: string,
  basePrice: number,
  points = 30,
): Promise<SeriesPoint[]> {
  const real = await twelveDataSeries(symbol, points);
  return real ?? mockSeries(basePrice, symbol, points);
}

export type OhlcPoint = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

// TradingView-style timeframe presets — each maps to a Twelve Data
// interval + how many bars covers that window. Intraday intervals cost
// more API credits than daily, so 1D/1W deliberately use the coarsest
// interval that still looks like a real intraday/short-range chart rather
// than defaulting everything to 1day.
export type ChartTimeframe = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y";

export const CHART_TIMEFRAMES: ChartTimeframe[] = ["1D", "1W", "1M", "3M", "6M", "1Y"];

const TIMEFRAME_CONFIG: Record<ChartTimeframe, { interval: string; points: number }> = {
  "1D": { interval: "5min", points: 78 }, // ~6.5h regular session / 5min bars
  "1W": { interval: "30min", points: 65 }, // ~5 trading days / 30min bars
  "1M": { interval: "1day", points: 22 },
  "3M": { interval: "1day", points: 65 },
  "6M": { interval: "1day", points: 130 },
  "1Y": { interval: "1day", points: 252 },
};

async function twelveDataOhlc(symbol: string, interval: string, points: number): Promise<OhlcPoint[] | null> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=${points}&apikey=${apiKey}`,
      { next: { revalidate: CACHE_SECONDS } },
    );
    const data = await res.json();
    if (data.code || !Array.isArray(data.values)) return null;

    return data.values
      .map(
        (v: { datetime: string; open: string; high: string; low: string; close: string; volume?: string }) => ({
          date: v.datetime,
          open: parseFloat(v.open),
          high: parseFloat(v.high),
          low: parseFloat(v.low),
          close: parseFloat(v.close),
          volume: v.volume ? parseInt(v.volume, 10) : null,
        }),
      )
      .reverse();
  } catch {
    return null;
  }
}

function intervalMinutes(interval: string): number | null {
  if (interval.endsWith("min")) return parseInt(interval, 10);
  if (interval.endsWith("h")) return parseInt(interval, 10) * 60;
  return null; // daily+ intervals walk by calendar day instead
}

// Synthesizes plausible OHLC bars for the mock fallback — a close-price
// random walk stepped at the same spacing as the real interval would be
// (5/30 minutes for the 1D/1W timeframes, whole days otherwise), so a 1D
// chart shows one trading session's worth of bars instead of accidentally
// reusing the daily walk and rendering months of history under a "1D"
// label. Volume is a plausible synthetic magnitude (larger on bigger
// moves), clearly not real, but present so the volume indicator has
// something to render in mock mode.
function mockOhlc(basePrice: number, seedKey: string, interval: string, points = 30): OhlcPoint[] {
  const stepMinutes = intervalMinutes(interval);
  const timestamps: string[] = [];

  if (stepMinutes) {
    const now = new Date();
    for (let i = points - 1; i >= 0; i--) {
      const t = new Date(now.getTime() - i * stepMinutes * 60_000);
      timestamps.push(t.toISOString().slice(0, 16).replace("T", " "));
    }
  } else {
    for (let i = points - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      timestamps.push(d.toISOString().slice(0, 10));
    }
  }

  let value = basePrice * 0.99;
  let prevClose = value;
  return timestamps.map((date) => {
    const rand = seededRandom(`${seedKey}:${interval}:${date}`);
    value = value * (1 + (rand - 0.5) * (stepMinutes ? 0.004 : 0.03));
    const open = prevClose;
    const rangeSeed = seededRandom(`${seedKey}:${interval}:range:${date}`);
    const wick = Math.abs(value - open) * (0.3 + rangeSeed * 0.7) + value * 0.002;
    const volumeSeed = seededRandom(`${seedKey}:${interval}:volume:${date}`);
    const moveSize = Math.abs(value - open) / open;
    prevClose = value;
    return {
      date,
      open,
      close: value,
      high: Math.max(open, value) + wick,
      low: Math.min(open, value) - wick,
      volume: Math.round((500_000 + volumeSeed * 2_000_000) * (1 + moveSize * 10)),
    };
  });
}

export async function getOhlcSeries(
  symbol: string,
  basePrice: number,
  timeframe: ChartTimeframe = "3M",
): Promise<OhlcPoint[]> {
  const { interval, points } = TIMEFRAME_CONFIG[timeframe];
  const real = await twelveDataOhlc(symbol, interval, points);
  return real ?? mockOhlc(basePrice, symbol, interval, points);
}
