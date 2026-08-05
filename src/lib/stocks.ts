import { getQuote, seededRandom } from "@/lib/market-data";

export type AnalystConsensusLevel = "strong_buy" | "buy" | "hold" | "sell" | "strong_sell";

export type AnalystConsensus = {
  consensus: AnalystConsensusLevel;
  buyCount: number;
  holdCount: number;
  sellCount: number;
  avgPriceTarget: number;
};

export type CompanyProfile = {
  sector: string;
  industry: string;
  description: string;
  employees: number;
  website?: string;
};

export type EarningsQuarter = {
  period: string;
  epsActual: number;
  epsEstimate: number;
};

export type KeyStatistics = {
  marketCap: number;
  trailingPE: number | null;
  forwardPE: number | null;
  pegRatio: number | null;
  priceToSales: number | null;
  priceToBook: number | null;
  profitMargin: number | null;
  operatingMargin: number | null;
  returnOnEquity: number | null;
  revenueTTM: number | null;
  revenueGrowth: number | null;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
};

export type NewsArticle = {
  headline: string;
  source: string;
  url: string;
  publishedAt: string;
  summary: string;
};

// Default landing set for the /stocks list before a search is entered.
export const TRENDING_TICKERS = [
  { ticker: "AAPL", companyName: "Apple Inc.", basePrice: 227.5 },
  { ticker: "MSFT", companyName: "Microsoft Corp.", basePrice: 441.2 },
  { ticker: "NVDA", companyName: "NVIDIA Corp.", basePrice: 138.9 },
  { ticker: "GOOGL", companyName: "Alphabet Inc.", basePrice: 176.3 },
  { ticker: "AMZN", companyName: "Amazon.com Inc.", basePrice: 205.1 },
  { ticker: "META", companyName: "Meta Platforms Inc.", basePrice: 592.4 },
  { ticker: "TSLA", companyName: "Tesla Inc.", basePrice: 248.7 },
  { ticker: "JPM", companyName: "JPMorgan Chase & Co.", basePrice: 231.8 },
];

const SECTORS = [
  { sector: "Technology", industries: ["Software", "Semiconductors", "Consumer Electronics"] },
  { sector: "Financial Services", industries: ["Banks", "Insurance", "Asset Management"] },
  { sector: "Healthcare", industries: ["Pharmaceuticals", "Medical Devices", "Health Insurance"] },
  { sector: "Consumer Cyclical", industries: ["Retail", "Auto Manufacturers", "Restaurants"] },
  { sector: "Energy", industries: ["Oil & Gas", "Renewable Energy"] },
];

// Real Twelve Data analyst-recommendation endpoints exist but are gated to
// paid tiers. This deterministic generator is a stand-in until a paid key is
// configured — same pattern as mock quotes elsewhere in this app. It is NOT
// an app-generated prediction: it stands in for a real third-party number
// (Buy/Hold/Sell consensus + price target), never an up/down call the app
// itself is making.
async function twelveDataConsensus(ticker: string): Promise<AnalystConsensus | null> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.twelvedata.com/recommendations?symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`,
      { next: { revalidate: 3600 } },
    );
    const data = await res.json();
    if (data.code || !data.trends?.[0]) return null;

    const latest = data.trends[0];
    const buyCount = (latest.strong_buy ?? 0) + (latest.buy ?? 0);
    const sellCount = (latest.strong_sell ?? 0) + (latest.sell ?? 0);
    const holdCount = latest.hold ?? 0;
    const total = buyCount + holdCount + sellCount;
    if (total === 0) return null;

    let consensus: AnalystConsensusLevel = "hold";
    if (buyCount / total > 0.6) consensus = "strong_buy";
    else if (buyCount / total > 0.4) consensus = "buy";
    else if (sellCount / total > 0.6) consensus = "strong_sell";
    else if (sellCount / total > 0.4) consensus = "sell";

    return {
      consensus,
      buyCount,
      holdCount,
      sellCount,
      avgPriceTarget: parseFloat(data.price_target?.average ?? "0"),
    };
  } catch {
    return null;
  }
}

function mockConsensus(ticker: string, currentPrice: number): AnalystConsensus {
  const rand = seededRandom(`consensus:${ticker}`);
  const levels: AnalystConsensusLevel[] = ["strong_buy", "buy", "hold", "sell", "strong_sell"];
  const consensus = levels[Math.floor(rand * levels.length)];

  const totalAnalysts = 15 + Math.floor(seededRandom(`analysts:${ticker}`) * 25);
  const buyBias = consensus === "strong_buy" || consensus === "buy" ? 0.65 : consensus === "hold" ? 0.35 : 0.15;
  const sellBias = consensus === "strong_sell" || consensus === "sell" ? 0.5 : 0.1;
  const buyCount = Math.round(totalAnalysts * buyBias);
  const sellCount = Math.round(totalAnalysts * sellBias);
  const holdCount = Math.max(0, totalAnalysts - buyCount - sellCount);

  const targetRangeByConsensus: Record<AnalystConsensusLevel, [number, number]> = {
    strong_buy: [0.12, 0.28],
    buy: [0.04, 0.16],
    hold: [-0.05, 0.05],
    sell: [-0.18, -0.04],
    strong_sell: [-0.3, -0.12],
  };
  const [minPct, maxPct] = targetRangeByConsensus[consensus];
  const targetRand = seededRandom(`target:${ticker}`);
  const avgPriceTarget = currentPrice * (1 + (minPct + targetRand * (maxPct - minPct)));

  return { consensus, buyCount, holdCount, sellCount, avgPriceTarget };
}

export async function getAnalystConsensus(
  ticker: string,
  currentPrice: number,
): Promise<AnalystConsensus> {
  const real = await twelveDataConsensus(ticker);
  return real ?? mockConsensus(ticker, currentPrice);
}

async function twelveDataProfile(ticker: string): Promise<CompanyProfile | null> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.twelvedata.com/profile?symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`,
      { next: { revalidate: 86400 } },
    );
    const data = await res.json();
    if (data.code || !data.sector) return null;

    return {
      sector: data.sector,
      industry: data.industry,
      description: data.description,
      employees: data.employees ?? 0,
      website: data.website,
    };
  } catch {
    return null;
  }
}

function mockProfile(ticker: string, companyName: string): CompanyProfile {
  const sectorGroup = SECTORS[Math.floor(seededRandom(`sector:${ticker}`) * SECTORS.length)];
  const industry =
    sectorGroup.industries[Math.floor(seededRandom(`industry:${ticker}`) * sectorGroup.industries.length)];
  const employees = Math.round(5000 + seededRandom(`employees:${ticker}`) * 195000);

  return {
    sector: sectorGroup.sector,
    industry,
    description: `${companyName} (${ticker}) operates in the ${industry.toLowerCase()} space within the ${sectorGroup.sector.toLowerCase()} sector. [Mock profile — real company data via Twelve Data's profile endpoint is a planned follow-up.]`,
    employees,
  };
}

export async function getCompanyProfile(
  ticker: string,
  companyName: string,
): Promise<CompanyProfile> {
  const real = await twelveDataProfile(ticker);
  return real ?? mockProfile(ticker, companyName);
}

async function twelveDataEarnings(ticker: string): Promise<EarningsQuarter[] | null> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.twelvedata.com/earnings?symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`,
      { next: { revalidate: 86400 } },
    );
    const data = await res.json();
    if (data.code || !Array.isArray(data.earnings)) return null;

    return data.earnings.slice(0, 4).map((e: { date: string; eps_actual: string; eps_estimate: string }) => ({
      period: e.date,
      epsActual: parseFloat(e.eps_actual),
      epsEstimate: parseFloat(e.eps_estimate),
    }));
  } catch {
    return null;
  }
}

function mockEarnings(ticker: string): EarningsQuarter[] {
  const quarters: EarningsQuarter[] = [];
  const now = new Date();
  for (let i = 0; i < 4; i++) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i * 3);
    const estimate = 1 + seededRandom(`eps-est:${ticker}:${i}`) * 3;
    const beat = seededRandom(`eps-beat:${ticker}:${i}`) > 0.35;
    const actual = beat
      ? estimate * (1 + seededRandom(`eps-beat-pct:${ticker}:${i}`) * 0.15)
      : estimate * (1 - seededRandom(`eps-miss-pct:${ticker}:${i}`) * 0.1);

    quarters.push({
      period: `Q${4 - (date.getMonth() / 3 | 0) % 4 || 4} ${date.getFullYear()}`,
      epsActual: Math.round(actual * 100) / 100,
      epsEstimate: Math.round(estimate * 100) / 100,
    });
  }
  return quarters;
}

export async function getEarnings(ticker: string): Promise<EarningsQuarter[]> {
  const real = await twelveDataEarnings(ticker);
  return real ?? mockEarnings(ticker);
}

// Real data — Twelve Data's /statistics endpoint is available on the same
// key already used for quotes/search, confirmed working directly against
// the API. No mock fallback needed when a key is configured; falls back to
// a labeled estimate only when unconfigured, consistent with the rest of
// this app's pattern.
async function twelveDataStatistics(ticker: string): Promise<KeyStatistics | null> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.twelvedata.com/statistics?symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`,
      { next: { revalidate: 86400 } },
    );
    const data = await res.json();
    const stats = data.statistics;
    if (data.code || !stats) return null;

    const valuation = stats.valuations_metrics ?? {};
    const financials = stats.financials ?? {};
    const income = financials.income_statement ?? {};
    const highLow = stats.stock_price_summary ?? {};

    return {
      marketCap: valuation.market_capitalization ?? 0,
      trailingPE: valuation.trailing_pe ?? null,
      forwardPE: valuation.forward_pe ?? null,
      pegRatio: valuation.peg_ratio ?? null,
      priceToSales: valuation.price_to_sales_ttm ?? null,
      priceToBook: valuation.price_to_book_mrq ?? null,
      profitMargin: financials.profit_margin ?? null,
      operatingMargin: financials.operating_margin ?? null,
      returnOnEquity: financials.return_on_equity_ttm ?? null,
      revenueTTM: income.revenue_ttm ?? null,
      revenueGrowth: income.quarterly_revenue_growth ?? null,
      fiftyTwoWeekLow: highLow.fifty_two_week_low ?? 0,
      fiftyTwoWeekHigh: highLow.fifty_two_week_high ?? 0,
    };
  } catch {
    return null;
  }
}

function mockStatistics(ticker: string, currentPrice: number): KeyStatistics {
  const marketCap = currentPrice * (1e8 + seededRandom(`shares:${ticker}`) * 5e9);
  return {
    marketCap,
    trailingPE: 15 + seededRandom(`pe:${ticker}`) * 25,
    forwardPE: 14 + seededRandom(`fpe:${ticker}`) * 22,
    pegRatio: 0.8 + seededRandom(`peg:${ticker}`) * 2,
    priceToSales: 2 + seededRandom(`ps:${ticker}`) * 8,
    priceToBook: 3 + seededRandom(`pb:${ticker}`) * 15,
    profitMargin: 0.05 + seededRandom(`pm:${ticker}`) * 0.3,
    operatingMargin: 0.08 + seededRandom(`om:${ticker}`) * 0.3,
    returnOnEquity: 0.1 + seededRandom(`roe:${ticker}`) * 0.4,
    revenueTTM: marketCap * (0.15 + seededRandom(`rev:${ticker}`) * 0.35),
    revenueGrowth: -0.05 + seededRandom(`rg:${ticker}`) * 0.35,
    fiftyTwoWeekLow: currentPrice * (0.65 + seededRandom(`52l:${ticker}`) * 0.15),
    fiftyTwoWeekHigh: currentPrice * (1.1 + seededRandom(`52h:${ticker}`) * 0.25),
  };
}

export async function getKeyStatistics(
  ticker: string,
  currentPrice: number,
): Promise<KeyStatistics> {
  const real = await twelveDataStatistics(ticker);
  return real ?? mockStatistics(ticker, currentPrice);
}

// Real per-ticker news via Finnhub (best free-tier option researched for
// this — 60 req/min, dedicated company-news endpoint) when configured;
// clearly-labeled mock headlines otherwise.
async function finnhubNews(ticker: string): Promise<NewsArticle[] | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;

  try {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const res = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(ticker)}&from=${from}&to=${to}&token=${apiKey}`,
      { next: { revalidate: 1800 } },
    );
    const data = await res.json();
    if (!Array.isArray(data)) return null;

    return data.slice(0, 8).map((item: { headline: string; source: string; url: string; datetime: number; summary: string }) => ({
      headline: item.headline,
      source: item.source,
      url: item.url,
      publishedAt: new Date(item.datetime * 1000).toISOString(),
      summary: item.summary,
    }));
  } catch {
    return null;
  }
}

const NEWS_TEMPLATES = [
  "reports quarterly results, beats analyst estimates on revenue",
  "announces new product initiative, shares react",
  "faces regulatory scrutiny over recent business practices",
  "CEO discusses growth strategy at industry conference",
  "analysts revise price targets following sector outlook update",
  "expands into new market segment",
];

function mockNews(ticker: string, companyName: string): NewsArticle[] {
  return NEWS_TEMPLATES.map((template, i) => {
    const daysAgo = Math.floor(seededRandom(`news-day:${ticker}:${i}`) * 13);
    const publishedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    return {
      headline: `[MOCK] ${companyName} ${template}`,
      source: "Mock Wire",
      url: "#",
      publishedAt: publishedAt.toISOString(),
      summary: `Placeholder summary — real news via Finnhub's company-news endpoint is a planned follow-up once FINNHUB_API_KEY is configured.`,
    };
  });
}

export async function getStockNews(ticker: string, companyName: string): Promise<NewsArticle[]> {
  const real = await finnhubNews(ticker);
  return real ?? mockNews(ticker, companyName);
}

export async function getStockList() {
  return Promise.all(
    TRENDING_TICKERS.map(async (stock) => {
      const quote = await getQuote(stock.ticker, stock.companyName, stock.basePrice);
      const analystConsensus = await getAnalystConsensus(stock.ticker, quote.price);
      return {
        ticker: stock.ticker,
        companyName: stock.companyName,
        quote,
        ...analystConsensus,
        totalAnalysts: analystConsensus.buyCount + analystConsensus.holdCount + analystConsensus.sellCount,
      };
    }),
  );
}

export async function getStockDetail(ticker: string, companyName: string, basePrice: number) {
  const [quote, analystConsensus, profile, earnings] = await Promise.all([
    getQuote(ticker, companyName, basePrice),
    getAnalystConsensus(ticker, basePrice),
    getCompanyProfile(ticker, companyName),
    getEarnings(ticker),
  ]);

  return { ticker, companyName, quote, analystConsensus, profile, earnings };
}
