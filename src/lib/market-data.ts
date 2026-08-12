import { prisma } from "@/lib/prisma";

export type Quote = {
  symbol: string;
  label: string;
  price: number;
  changePercent: number;
  // False only when this came straight from Twelve Data this request.
  // Never presented as live when it isn't — see TickerTape, StatNumber
  // usage, and the stock detail page for where this actually changes
  // what's shown to a visitor.
  isEstimate: boolean;
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

function mockQuote(symbol: string, label: string, anchorPrice: number): Quote {
  const rand = seededRandom(daySeed(symbol));
  const changePercent = (rand - 0.5) * 2; // -1% to +1%
  const price = anchorPrice * (1 + changePercent / 100);
  return { symbol, label, price, changePercent, isEstimate: true };
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
      isEstimate: false,
    };
  } catch {
    return null;
  }
}

// Last real price seen for a symbol, persisted whenever a live fetch
// succeeds — the anchor used for the fallback estimate when the live
// feed is down, instead of a value hardcoded at project setup (which
// only ever drifts further from reality the longer the project runs).
// Fire-and-forget: never blocks or fails the quote a visitor is waiting
// on for a write that's purely for next time.
function persistLastKnownPrice(symbol: string, price: number, changePercent: number) {
  prisma.lastKnownPrice
    .upsert({
      where: { symbol },
      create: { symbol, price, changePercent },
      update: { price, changePercent },
    })
    .catch((err: unknown) => console.error("failed to persist last known price", symbol, err));
}

export async function getQuote(
  symbol: string,
  label: string,
  basePrice: number,
): Promise<Quote> {
  const real = await twelveDataQuote(symbol, label);
  if (real) {
    persistLastKnownPrice(symbol, real.price, real.changePercent);
    return real;
  }

  const lastKnown = await prisma.lastKnownPrice.findUnique({ where: { symbol } }).catch(() => null);
  return mockQuote(symbol, label, lastKnown?.price ?? basePrice);
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

export type OhlcPoint = { date: string; open: number; high: number; low: number; close: number };

async function twelveDataOhlc(symbol: string, points = 30): Promise<OhlcPoint[] | null> {
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
      .map((v: { datetime: string; open: string; high: string; low: string; close: string }) => ({
        date: v.datetime,
        open: parseFloat(v.open),
        high: parseFloat(v.high),
        low: parseFloat(v.low),
        close: parseFloat(v.close),
      }))
      .reverse();
  } catch {
    return null;
  }
}

// Synthesizes plausible OHLC bars from the same close-price walk used
// elsewhere for mock data, so the mock fallback looks like real candles
// instead of a flat line — open/high/low are derived from that day's and
// the prior day's close, not independently random.
function mockOhlc(basePrice: number, seedKey: string, points = 30): OhlcPoint[] {
  const closes = mockSeries(basePrice, seedKey, points);
  return closes.map((point, i) => {
    const prevClose = closes[i - 1]?.value ?? point.value;
    const open = prevClose;
    const rangeSeed = seededRandom(`${seedKey}:range:${point.date}`);
    const wick = Math.abs(point.value - open) * (0.3 + rangeSeed * 0.7) + point.value * 0.002;
    return {
      date: point.date,
      open,
      close: point.value,
      high: Math.max(open, point.value) + wick,
      low: Math.min(open, point.value) - wick,
    };
  });
}

export async function getOhlcSeries(
  symbol: string,
  basePrice: number,
  points = 30,
): Promise<OhlcPoint[]> {
  const real = await twelveDataOhlc(symbol, points);
  return real ?? mockOhlc(basePrice, symbol, points);
}
