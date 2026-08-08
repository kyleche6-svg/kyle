import { requireActiveSubscription } from "@/lib/subscription-guard";
import { getQuote } from "@/lib/market-data";
import { getAnalystConsensus, getKeyStatistics, TRENDING_TICKERS } from "@/lib/stocks";
import { searchStocks } from "@/lib/stock-search";
import { Panel } from "@/components/Panel";
import { Disclaimer } from "@/components/Disclaimer";
import { PageHeader } from "@/components/PageHeader";

function formatCompact(value: number) {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toFixed(0)}`;
}

function formatRatio(value: number | null) {
  return value === null ? "—" : value.toFixed(2);
}

function formatPercent(value: number | null) {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

const CONSENSUS_LABELS: Record<string, string> = {
  strong_buy: "Strong Buy",
  buy: "Buy",
  hold: "Hold",
  sell: "Sell",
  strong_sell: "Strong Sell",
};

async function resolveTicker(raw: string): Promise<{ ticker: string; companyName: string; basePrice: number }> {
  const ticker = raw.trim().toUpperCase();
  const trending = TRENDING_TICKERS.find((t) => t.ticker === ticker);
  if (trending) return trending;
  const matches = await searchStocks(ticker);
  const match = matches.find((m) => m.ticker === ticker);
  return { ticker, companyName: match?.companyName ?? ticker, basePrice: 100 };
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ tickers?: string }>;
}) {
  await requireActiveSubscription();

  const { tickers: tickersParam } = await searchParams;
  const rawTickers = (tickersParam ?? "AAPL,MSFT,GOOGL")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 4);

  const resolved = await Promise.all(rawTickers.map(resolveTicker));
  const rows = await Promise.all(
    resolved.map(async (r) => {
      const [quote, consensus, stats] = await Promise.all([
        getQuote(r.ticker, r.companyName, r.basePrice),
        getAnalystConsensus(r.ticker, r.basePrice),
        getKeyStatistics(r.ticker, r.basePrice),
      ]);
      return { ...r, quote, consensus, stats };
    }),
  );

  const metrics: { label: string; render: (row: (typeof rows)[number]) => string }[] = [
    { label: "Price", render: (r) => `$${r.quote.price.toFixed(2)}` },
    { label: "Change", render: (r) => `${r.quote.changePercent >= 0 ? "+" : ""}${r.quote.changePercent.toFixed(2)}%` },
    { label: "Market Cap", render: (r) => formatCompact(r.stats.marketCap) },
    { label: "P/E (TTM)", render: (r) => formatRatio(r.stats.trailingPE) },
    { label: "Forward P/E", render: (r) => formatRatio(r.stats.forwardPE) },
    { label: "P/S Ratio", render: (r) => formatRatio(r.stats.priceToSales) },
    { label: "Profit Margin", render: (r) => formatPercent(r.stats.profitMargin) },
    { label: "Revenue Growth", render: (r) => formatPercent(r.stats.revenueGrowth) },
    { label: "Analyst Consensus", render: (r) => CONSENSUS_LABELS[r.consensus.consensus] },
    { label: "Avg. Price Target", render: (r) => `$${r.consensus.avgPriceTarget.toFixed(2)}` },
    { label: "52W Range", render: (r) => `$${r.stats.fiftyTwoWeekLow.toFixed(0)}–$${r.stats.fiftyTwoWeekHigh.toFixed(0)}` },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader
        title="Compare Stocks"
        description="Side-by-side key stats and real third-party analyst consensus — up to 4 tickers."
      />

      <form method="GET" className="mt-6">
        <label htmlFor="tickers" className="text-xs text-muted">Tickers (comma-separated)</label>
        <div className="mt-1 flex gap-2">
          <input
            id="tickers"
            name="tickers"
            defaultValue={rawTickers.join(",")}
            placeholder="AAPL,MSFT,GOOGL"
            className="w-full max-w-md rounded-md border border-panel-border bg-panel px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Compare
          </button>
        </div>
      </form>

      <Panel className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-panel-border text-xs text-muted">
                <th className="pb-2 pr-4 font-normal">Metric</th>
                {rows.map((r) => (
                  <th key={r.ticker} className="pb-2 pr-4 font-mono font-medium text-foreground">
                    {r.ticker}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr key={metric.label} className="border-b border-panel-border/50">
                  <td className="py-2 pr-4 text-xs text-muted">{metric.label}</td>
                  {rows.map((r) => (
                    <td key={r.ticker} className="py-2 pr-4 font-mono text-xs tabular-nums">
                      {metric.render(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="mt-6">
        <Disclaimer />
      </div>
    </div>
  );
}
