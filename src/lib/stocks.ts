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
