import { getQuote, CURRENCY_PAIRS, COMMODITIES } from "@/lib/market-data";
import {
  getAnalystConsensus,
  getCompanyProfile,
  getEarnings,
  getKeyStatistics,
  getStockNews,
  TRENDING_TICKERS,
} from "@/lib/stocks";
import { searchStocks } from "@/lib/stock-search";
import { getHistoricalReturnFrequency } from "@/lib/historical-stats";
import { getInsiderTrades } from "@/lib/insider-trading";
import { getEconomicEvents } from "@/lib/economic-calendar";

// Every tool here only reads data that is already shown elsewhere on
// DollarWatch (quotes, third-party analyst consensus, disclosed trades,
// economic calendar). The bot answers from this data — it never generates
// its own buy/sell call or a forward-looking prediction (same hard
// constraint as the rest of the app, see PRODUCT.md Product Principle #1).
// Plain JSON-schema tool defs, provider-agnostic (converted to each
// provider's expected shape — OpenAI/Groq function-calling format, or
// Anthropic tool-use format — at the call site in the API route).
export type ChatToolDef = {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
};

export const CHAT_TOOLS: ChatToolDef[] = [
  {
    name: "get_stock_overview",
    description:
      "Get a stock's current quote, real third-party analyst consensus (buy/hold/sell counts and average price target), company profile, key statistics (market cap, P/E, margins, etc.), and recent quarterly earnings. Use for any question about a specific ticker or company.",
    parameters: {
      type: "object",
      properties: {
        ticker: { type: "string", description: "Stock ticker symbol, e.g. AAPL" },
      },
      required: ["ticker"],
    },
  },
  {
    name: "get_stock_news",
    description: "Get recent news headlines for a specific stock ticker.",
    parameters: {
      type: "object",
      properties: {
        ticker: { type: "string", description: "Stock ticker symbol, e.g. AAPL" },
      },
      required: ["ticker"],
    },
  },
  {
    name: "get_stock_historical_frequency",
    description:
      "Get how often a stock's price was higher after 1/3/6/12-month rolling windows across its real historical price data. This is a backward-looking historical frequency, not a forecast.",
    parameters: {
      type: "object",
      properties: {
        ticker: { type: "string", description: "Stock ticker symbol, e.g. AAPL" },
      },
      required: ["ticker"],
    },
  },
  {
    name: "search_stocks",
    description: "Search for stocks by company name or ticker to find the correct ticker symbol.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Company name or partial ticker" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_market_dashboard",
    description:
      "Get current USD currency pair rates (EUR/USD, USD/JPY, GBP/USD, USD/CNY) and commodity prices (gold, oil, silver).",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_economic_calendar",
    description: "Get upcoming and recent economic calendar events (e.g. CPI, Fed rate decisions, jobs reports).",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_insider_trades",
    description:
      "Get recent SEC Form 4 insider trading filings — company officers, directors, and 10%+ owners disclosing trades in their own company's stock. Optionally filter to one ticker.",
    parameters: {
      type: "object",
      properties: {
        ticker: {
          type: "string",
          description: "Stock ticker to filter to, omit for the general recent-filings feed",
        },
      },
    },
  },
];

function resolveTrendingTicker(ticker: string) {
  return TRENDING_TICKERS.find((t) => t.ticker === ticker.toUpperCase());
}

async function resolveBasePrice(ticker: string): Promise<{ companyName: string; basePrice: number }> {
  const trending = resolveTrendingTicker(ticker);
  if (trending) return { companyName: trending.companyName, basePrice: trending.basePrice };

  const matches = await searchStocks(ticker);
  const match = matches.find((m) => m.ticker === ticker.toUpperCase());
  return { companyName: match?.companyName ?? ticker.toUpperCase(), basePrice: 100 };
}

export async function executeChatTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "get_stock_overview": {
      const ticker = String(input.ticker ?? "").toUpperCase();
      const { companyName, basePrice } = await resolveBasePrice(ticker);
      const [quote, consensus, profile, stats, earnings] = await Promise.all([
        getQuote(ticker, companyName, basePrice),
        getAnalystConsensus(ticker, basePrice),
        getCompanyProfile(ticker, companyName),
        getKeyStatistics(ticker, basePrice),
        getEarnings(ticker),
      ]);
      return { ticker, companyName, quote, analystConsensus: consensus, profile, keyStatistics: stats, earnings };
    }
    case "get_stock_news": {
      const ticker = String(input.ticker ?? "").toUpperCase();
      const { companyName } = await resolveBasePrice(ticker);
      return { ticker, news: await getStockNews(ticker, companyName) };
    }
    case "get_stock_historical_frequency": {
      const ticker = String(input.ticker ?? "").toUpperCase();
      const { basePrice } = await resolveBasePrice(ticker);
      return { ticker, returnFrequency: await getHistoricalReturnFrequency(ticker, basePrice) };
    }
    case "search_stocks": {
      const query = String(input.query ?? "");
      return { results: await searchStocks(query) };
    }
    case "get_market_dashboard": {
      const [currencies, commodities] = await Promise.all([
        Promise.all(CURRENCY_PAIRS.map((p) => getQuote(p.symbol, p.label, p.basePrice))),
        Promise.all(COMMODITIES.map((c) => getQuote(c.symbol, c.label, c.basePrice))),
      ]);
      return { currencies, commodities };
    }
    case "get_economic_calendar": {
      return { events: await getEconomicEvents() };
    }
    case "get_insider_trades": {
      const ticker = typeof input.ticker === "string" ? input.ticker.toUpperCase() : undefined;
      return { trades: await getInsiderTrades(60, ticker) };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
