import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowSquareOut, TrendUp, TrendDown, Minus, Buildings, Users } from "@phosphor-icons/react/dist/ssr";
import { requireActiveSubscription } from "@/lib/subscription-guard";
import { getQuote, getSeries } from "@/lib/market-data";
import {
  getAnalystConsensus,
  getCompanyProfile,
  getEarnings,
  getKeyStatistics,
  getStockNews,
  TRENDING_TICKERS,
} from "@/lib/stocks";
import { searchStocks } from "@/lib/stock-search";
import { Panel } from "@/components/Panel";
import { StatNumber } from "@/components/StatNumber";
import { StockPriceBarChart } from "@/components/StockPriceBarChart";
import { Disclaimer } from "@/components/Disclaimer";

const CONSENSUS_LABELS: Record<string, string> = {
  strong_buy: "Strong Buy",
  buy: "Buy",
  hold: "Hold",
  sell: "Sell",
  strong_sell: "Strong Sell",
};

function consensusColor(consensus: string) {
  if (consensus === "strong_buy" || consensus === "buy") return "text-positive";
  if (consensus === "sell" || consensus === "strong_sell") return "text-negative";
  return "text-muted";
}

function formatDelta(changePercent: number) {
  const sign = changePercent >= 0 ? "+" : "";
  return `${sign}${changePercent.toFixed(2)}%`;
}

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

function formatNewsDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default async function StockDetailPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  await requireActiveSubscription();

  const { ticker: rawTicker } = await params;
  const ticker = rawTicker.toUpperCase();
  if (!/^[A-Z.]{1,6}$/.test(ticker)) notFound();

  const trending = TRENDING_TICKERS.find((t) => t.ticker === ticker);
  const matches = trending ? [] : await searchStocks(ticker);
  const match = matches.find((m) => m.ticker === ticker);
  const companyName = trending?.companyName ?? match?.companyName ?? ticker;
  const basePrice = trending?.basePrice ?? 100;

  const [quote, series, consensus, profile, earnings, stats, news] = await Promise.all([
    getQuote(ticker, companyName, basePrice),
    getSeries(ticker, basePrice, 20),
    getAnalystConsensus(ticker, basePrice),
    getCompanyProfile(ticker, companyName),
    getEarnings(ticker),
    getKeyStatistics(ticker, basePrice),
    getStockNews(ticker, companyName),
  ]);

  const isPositive = quote.changePercent >= 0;
  const targetUpside = ((consensus.avgPriceTarget - quote.price) / quote.price) * 100;

  const statTiles = [
    { label: "Market Cap", value: formatCompact(stats.marketCap) },
    { label: "P/E (TTM)", value: formatRatio(stats.trailingPE) },
    { label: "Forward P/E", value: formatRatio(stats.forwardPE) },
    { label: "PEG Ratio", value: formatRatio(stats.pegRatio) },
    { label: "P/S Ratio", value: formatRatio(stats.priceToSales) },
    { label: "P/B Ratio", value: formatRatio(stats.priceToBook) },
    { label: "Profit Margin", value: formatPercent(stats.profitMargin) },
    { label: "Operating Margin", value: formatPercent(stats.operatingMargin) },
    { label: "ROE", value: formatPercent(stats.returnOnEquity) },
    { label: "Revenue (TTM)", value: stats.revenueTTM ? formatCompact(stats.revenueTTM) : "—" },
    { label: "Revenue Growth", value: formatPercent(stats.revenueGrowth) },
    { label: "52W Range", value: `$${stats.fiftyTwoWeekLow.toFixed(0)}–$${stats.fiftyTwoWeekHigh.toFixed(0)}` },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link
        href="/stocks"
        className="flex w-fit items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft size={14} /> Back to stocks
      </Link>

      <div className="mt-3 flex items-baseline justify-between">
        <div>
          <h1 className="font-mono text-2xl font-semibold">{ticker}</h1>
          <p className="text-sm text-muted">{companyName}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-3xl font-semibold tabular-nums">
            ${quote.price.toFixed(2)}
          </p>
          <p
            className={`flex items-center justify-end gap-1 font-mono text-sm tabular-nums ${
              isPositive ? "text-positive" : "text-negative"
            }`}
          >
            {isPositive ? <TrendUp size={14} weight="bold" /> : <TrendDown size={14} weight="bold" />}
            {formatDelta(quote.changePercent)}
          </p>
        </div>
      </div>

      <Panel className="mt-4">
        <StockPriceBarChart data={series} />
      </Panel>

      <Panel title="Key statistics" className="mt-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 lg:grid-cols-6">
          {statTiles.map((tile) => (
            <div key={tile.label}>
              <p className="text-xs text-muted">{tile.label}</p>
              <p className="mt-0.5 font-mono text-sm font-medium tabular-nums">{tile.value}</p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Analyst consensus" className="lg:col-span-1">
          <p className={`text-lg font-semibold ${consensusColor(consensus.consensus)}`}>
            {CONSENSUS_LABELS[consensus.consensus]}
          </p>
          <p className="mt-1 text-xs text-muted">
            Based on {consensus.buyCount + consensus.holdCount + consensus.sellCount} analysts
          </p>
          <div className="mt-3 flex items-center gap-3 text-xs">
            <span className="text-positive">{consensus.buyCount} Buy</span>
            <span className="flex items-center gap-1 text-muted">
              <Minus size={10} /> {consensus.holdCount} Hold
            </span>
            <span className="text-negative">{consensus.sellCount} Sell</span>
          </div>
          <div className="mt-4 border-t border-panel-border pt-4">
            <StatNumber
              label="Avg. price target"
              value={`$${consensus.avgPriceTarget.toFixed(2)}`}
              delta={`${targetUpside >= 0 ? "+" : ""}${targetUpside.toFixed(1)}%`}
            />
          </div>
        </Panel>

        <Panel title="Company profile" className="lg:col-span-1">
          <div className="flex items-center gap-2 text-sm">
            <Buildings size={16} className="text-muted" />
            <span>
              {profile.sector} · {profile.industry}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm text-muted">
            <Users size={16} />
            {profile.employees.toLocaleString()} employees
          </div>
          <p className="mt-3 text-sm text-muted">{profile.description}</p>
        </Panel>

        <Panel title="Recent earnings (EPS)" className="lg:col-span-1">
          <div className="flex flex-col gap-2">
            {earnings.map((quarter) => {
              const beat = quarter.epsActual >= quarter.epsEstimate;
              return (
                <div
                  key={quarter.period}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted">{quarter.period}</span>
                  <span className="font-mono tabular-nums">
                    ${quarter.epsActual.toFixed(2)}{" "}
                    <span className="text-muted">vs ${quarter.epsEstimate.toFixed(2)} est.</span>{" "}
                    <span className={beat ? "text-positive" : "text-negative"}>
                      {beat ? "Beat" : "Miss"}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <Panel title="News" className="mt-4">
        <div className="flex flex-col divide-y divide-panel-border">
          {news.map((article, i) => (
            <a
              key={i}
              href={article.url}
              target={article.url === "#" ? undefined : "_blank"}
              rel="noopener noreferrer"
              className="group flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <div>
                <p className="text-sm font-medium group-hover:text-accent">
                  {article.headline}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {article.source} · {formatNewsDate(article.publishedAt)}
                </p>
                <p className="mt-1 text-xs text-muted">{article.summary}</p>
              </div>
              <ArrowSquareOut size={14} className="mt-0.5 shrink-0 text-muted" />
            </a>
          ))}
        </div>
      </Panel>

      <div className="mt-8">
        <Disclaimer />
      </div>
    </div>
  );
}
