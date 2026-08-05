import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, TrendUp, TrendDown } from "@phosphor-icons/react/dist/ssr";
import { requireActiveSubscription } from "@/lib/subscription-guard";
import { getPoliticianTrades, getPoliticianPortfolio } from "@/lib/trades";
import { Panel } from "@/components/Panel";
import { Disclaimer } from "@/components/Disclaimer";

function formatAmountRange(low: number, high: number) {
  const fmt = (n: number) => `$${n.toLocaleString()}`;
  return `${fmt(low)} – ${fmt(high)}`;
}

function formatUsd(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function PoliticianDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  await requireActiveSubscription();

  const { name: rawName } = await params;
  const politicianName = decodeURIComponent(rawName);

  const [trades, portfolio] = await Promise.all([
    getPoliticianTrades(politicianName),
    getPoliticianPortfolio(politicianName),
  ]);

  if (trades.length === 0) notFound();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link
        href="/politicians"
        className="flex w-fit items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft size={14} /> Back to politicians
      </Link>

      <h1 className="mt-3 text-2xl font-semibold">{politicianName}</h1>
      <p className="mt-1 text-sm text-muted">
        {trades.length} disclosed trades across {portfolio.length} tickers. Mock data — real
        ingestion from Senate eFD filings is a planned follow-up.
      </p>

      <Panel title="Estimated portfolio (by disclosed activity)" className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-panel-border text-xs text-muted">
                <th className="pb-2 pr-4 font-normal">Ticker</th>
                <th className="pb-2 pr-4 font-normal">Buys</th>
                <th className="pb-2 pr-4 font-normal">Sells</th>
                <th className="pb-2 font-normal">Net estimate</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.map((row) => (
                <tr key={row.ticker} className="border-b border-panel-border/50">
                  <td className="py-2 pr-4">
                    <Link
                      href={`/stocks/${row.ticker}`}
                      className="font-mono font-medium hover:text-accent"
                    >
                      {row.ticker}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs text-positive tabular-nums">
                    {row.buyCount > 0 ? `${formatUsd(row.buyTotal)} (${row.buyCount})` : "—"}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs text-negative tabular-nums">
                    {row.sellCount > 0 ? `${formatUsd(row.sellTotal)} (${row.sellCount})` : "—"}
                  </td>
                  <td className="py-2">
                    <span
                      className={`flex items-center gap-1 font-mono text-xs tabular-nums ${
                        row.netEstimate >= 0 ? "text-positive" : "text-negative"
                      }`}
                    >
                      {row.netEstimate >= 0 ? (
                        <TrendUp size={12} weight="bold" />
                      ) : (
                        <TrendDown size={12} weight="bold" />
                      )}
                      {formatUsd(Math.abs(row.netEstimate))} net {row.netEstimate >= 0 ? "bought" : "sold"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">
          Net estimate uses the midpoint of each disclosed amount range (buys minus sells) — a
          directional estimate, not an exact holding or current position.
        </p>
      </Panel>

      <Panel title="Full trade history" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-panel-border text-xs text-muted">
                <th className="pb-2 pr-4 font-normal">Ticker</th>
                <th className="pb-2 pr-4 font-normal">Direction</th>
                <th className="pb-2 pr-4 font-normal">Amount range</th>
                <th className="pb-2 pr-4 font-normal">Transaction date</th>
                <th className="pb-2 font-normal">Filed date</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => {
                const isBuy = trade.direction === "buy";
                return (
                  <tr key={trade.id} className="border-b border-panel-border/50">
                    <td className="py-2 pr-4 font-mono font-medium">{trade.ticker}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`flex items-center gap-1 ${
                          isBuy ? "text-positive" : "text-negative"
                        }`}
                      >
                        {isBuy ? (
                          <TrendUp size={12} weight="bold" />
                        ) : (
                          <TrendDown size={12} weight="bold" />
                        )}
                        {trade.direction}
                      </span>
                    </td>
                    <td className="py-2 pr-4 font-mono text-muted tabular-nums">
                      {formatAmountRange(trade.amountRangeLow, trade.amountRangeHigh)}
                    </td>
                    <td className="py-2 pr-4 text-muted">{formatDate(trade.transactionDate)}</td>
                    <td className="py-2 text-muted">{formatDate(trade.filedDate)}</td>
                  </tr>
                );
              })}
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
