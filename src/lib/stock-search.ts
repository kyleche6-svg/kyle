// Real symbol search via Twelve Data's symbol_search endpoint (any ticker,
// not just a curated list) with a static fallback list when no API key is
// configured or the request fails.
export type StockSearchResult = {
  ticker: string;
  companyName: string;
  exchange?: string;
};

const FALLBACK_UNIVERSE: StockSearchResult[] = [
  { ticker: "AAPL", companyName: "Apple Inc." },
  { ticker: "MSFT", companyName: "Microsoft Corp." },
  { ticker: "NVDA", companyName: "NVIDIA Corp." },
  { ticker: "GOOGL", companyName: "Alphabet Inc." },
  { ticker: "GOOG", companyName: "Alphabet Inc. (Class C)" },
  { ticker: "AMZN", companyName: "Amazon.com Inc." },
  { ticker: "META", companyName: "Meta Platforms Inc." },
  { ticker: "TSLA", companyName: "Tesla Inc." },
  { ticker: "JPM", companyName: "JPMorgan Chase & Co." },
  { ticker: "XOM", companyName: "Exxon Mobil Corp." },
  { ticker: "V", companyName: "Visa Inc." },
  { ticker: "MA", companyName: "Mastercard Inc." },
  { ticker: "WMT", companyName: "Walmart Inc." },
  { ticker: "UNH", companyName: "UnitedHealth Group" },
  { ticker: "AVGO", companyName: "Broadcom Inc." },
  { ticker: "LLY", companyName: "Eli Lilly and Co." },
  { ticker: "COST", companyName: "Costco Wholesale Corp." },
  { ticker: "NFLX", companyName: "Netflix Inc." },
  { ticker: "ADBE", companyName: "Adobe Inc." },
  { ticker: "CRM", companyName: "Salesforce Inc." },
  { ticker: "AMD", companyName: "Advanced Micro Devices" },
  { ticker: "INTC", companyName: "Intel Corp." },
  { ticker: "PEP", companyName: "PepsiCo Inc." },
  { ticker: "KO", companyName: "Coca-Cola Co." },
  { ticker: "DIS", companyName: "Walt Disney Co." },
  { ticker: "NKE", companyName: "Nike Inc." },
  { ticker: "MCD", companyName: "McDonald's Corp." },
  { ticker: "SBUX", companyName: "Starbucks Corp." },
  { ticker: "BA", companyName: "Boeing Co." },
  { ticker: "GE", companyName: "General Electric Co." },
  { ticker: "F", companyName: "Ford Motor Co." },
  { ticker: "GM", companyName: "General Motors Co." },
  { ticker: "T", companyName: "AT&T Inc." },
  { ticker: "VZ", companyName: "Verizon Communications" },
  { ticker: "PFE", companyName: "Pfizer Inc." },
  { ticker: "JNJ", companyName: "Johnson & Johnson" },
  { ticker: "BAC", companyName: "Bank of America Corp." },
  { ticker: "WFC", companyName: "Wells Fargo & Co." },
  { ticker: "GS", companyName: "Goldman Sachs Group" },
  { ticker: "ORCL", companyName: "Oracle Corp." },
  { ticker: "IBM", companyName: "International Business Machines" },
  { ticker: "UBER", companyName: "Uber Technologies" },
  { ticker: "ABNB", companyName: "Airbnb Inc." },
  { ticker: "PYPL", companyName: "PayPal Holdings" },
  { ticker: "SHOP", companyName: "Shopify Inc." },
  { ticker: "SQ", companyName: "Block Inc." },
  { ticker: "COIN", companyName: "Coinbase Global" },
  { ticker: "PLTR", companyName: "Palantir Technologies" },
  { ticker: "SNOW", companyName: "Snowflake Inc." },
  { ticker: "SPOT", companyName: "Spotify Technology" },
];

async function twelveDataSearch(query: string): Promise<StockSearchResult[] | null> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(query)}&apikey=${apiKey}`,
      { next: { revalidate: 3600 } },
    );
    const data = await res.json();
    if (data.code || !Array.isArray(data.data)) return null;

    const US_EXCHANGES = new Set(["NASDAQ", "NYSE", "NYSE ARCA", "NYSE MKT", "BATS"]);
    const seen = new Set<string>();
    const results: StockSearchResult[] = [];

    for (const item of data.data as Array<{
      symbol: string;
      instrument_name: string;
      exchange: string;
      instrument_type: string;
      currency: string;
    }>) {
      if (item.instrument_type !== "Common Stock") continue;
      if (item.currency !== "USD") continue;
      if (!US_EXCHANGES.has(item.exchange)) continue;
      if (seen.has(item.symbol)) continue;

      seen.add(item.symbol);
      results.push({
        ticker: item.symbol,
        companyName: item.instrument_name,
        exchange: item.exchange,
      });
      if (results.length >= 20) break;
    }

    return results;
  } catch {
    return null;
  }
}

function fallbackSearch(query: string): StockSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return FALLBACK_UNIVERSE.slice(0, 20);

  return FALLBACK_UNIVERSE.filter(
    (stock) =>
      stock.ticker.toLowerCase().includes(q) ||
      stock.companyName.toLowerCase().includes(q),
  ).slice(0, 20);
}

export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  const real = query.trim() ? await twelveDataSearch(query) : null;
  return real ?? fallbackSearch(query);
}
