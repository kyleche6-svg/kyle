// Real economic calendar — sourced live from Financial Modeling Prep's
// economic-calendar endpoint (free tier, real release dates/actuals/
// forecasts from official government statistical agencies, FMP just
// aggregates and republishes them). No free official single API covers
// every country's releases directly, which is why this goes through an
// aggregator rather than scraping a chain of central-bank sites.
const FMP_USER_AGENT = "DollarWatch (contact: support@dollarwatch.app)";
const CACHE_SECONDS = 3600; // real-world release calendars don't change intraday

export type EventImpact = "high" | "medium" | "low";

export type EconomicEvent = {
  id: string;
  eventName: string;
  currency: string;
  impact: EventImpact;
  eventTime: Date;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
};

// Kept to the currencies the rest of the app already tracks (see
// CURRENCY_PAIRS in market-data.ts) — FMP's feed spans dozens of
// countries, most irrelevant to a USD-strength-focused dashboard.
const TRACKED_CURRENCIES = new Set(["USD", "EUR", "GBP", "JPY", "CNY"]);

function formatNumber(value: number | null): string | null {
  if (value === null || Number.isNaN(value)) return null;
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
}

type FmpEvent = {
  date: string;
  event: string;
  currency: string;
  impact: string;
  actual: number | null;
  estimate: number | null;
  previous: number | null;
};

async function fetchFmpCalendar(): Promise<EconomicEvent[] | null> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return null;

  const from = new Date();
  from.setDate(from.getDate() - 2);
  const to = new Date();
  to.setDate(to.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  try {
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/economic_calendar?from=${fmt(from)}&to=${fmt(to)}&apikey=${apiKey}`,
      { headers: { "User-Agent": FMP_USER_AGENT }, next: { revalidate: CACHE_SECONDS } },
    );
    if (!res.ok) return null;
    const data: FmpEvent[] = await res.json();
    if (!Array.isArray(data)) return null;

    return data
      .filter((e) => TRACKED_CURRENCIES.has(e.currency) && e.impact)
      .map((e, i) => ({
        id: `${e.date}-${e.currency}-${i}`,
        eventName: e.event,
        currency: e.currency,
        impact: e.impact.toLowerCase() as EventImpact,
        eventTime: new Date(e.date),
        actual: formatNumber(e.actual),
        forecast: formatNumber(e.estimate),
        previous: formatNumber(e.previous),
      }))
      .sort((a, b) => a.eventTime.getTime() - b.eventTime.getTime());
  } catch {
    return null;
  }
}

export async function getEconomicEvents(): Promise<EconomicEvent[]> {
  const real = await fetchFmpCalendar();
  return real ?? [];
}
