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
