import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, TrendUp, TrendDown } from "@phosphor-icons/react/dist/ssr";
import { requireActiveSubscription } from "@/lib/subscription-guard";
import { getRealTradesForPolitician, getRealPoliticianPortfolio } from "@/lib/real-trades";
import { getPoliticianPerformance } from "@/lib/politician-performance";
import { Panel } from "@/components/Panel";
import { HoldingsPie } from "@/components/HoldingsPie";
import { Disclaimer } from "@/components/Disclaimer";

function formatPct(value: number | null) {
  return value === null ? "—" : `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
}

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

  const trades = await getRealTradesForPolitician(politicianName);
  if (trades.length === 0) notFound();
  const portfolio = getRealPoliticianPortfolio(trades);
  const performance = await getPoliticianPerformance(trades);

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
        {trades.length} real disclosed trades across {portfolio.length} tickers, filed under the
        STOCK Act via efdsearch.senate.gov.
      </p>

      <Panel title="Performance vs. S&P 500 (historical estimate)" className="mt-6">
        <p className="text-xs text-muted">
          Dollar-weighted estimate of how disclosed buys would have performed if held from their
          earliest purchase date to today, vs. holding the S&amp;P 500 (SPY) over those same
          entry dates. Ignores sells, position sizing beyond the disclosed range midpoint, fees,
          and taxes — a rough historical estimate, not the politician&apos;s actual current
          holdings or realized return, and not a forecast.
        </p>
        {performance.weightedReturn === null ? (
          <p className="mt-3 text-sm text-muted">Not enough price history to estimate.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted">Estimated return</p>
              <p
                className={`mt-0.5 font-mono text-2xl font-semibold tabular-nums ${
                  performance.weightedReturn >= 0 ? "text-positive" : "text-negative"
                }`}
              >
                {formatPct(performance.weightedReturn)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">S&amp;P 500, same period</p>
              <p className="mt-0.5 font-mono text-2xl font-semibold tabular-nums text-muted">
                {formatPct(performance.spyWeightedReturn)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Vs. S&amp;P 500</p>
              <p
                className={`mt-0.5 font-mono text-2xl font-semibold tabular-nums ${
                  (performance.weightedReturn ?? 0) >= (performance.spyWeightedReturn ?? 0)
                    ? "text-positive"
                    : "text-negative"
                }`}
              >
                {formatPct((performance.weightedReturn ?? 0) - (performance.spyWeightedReturn ?? 0))}
              </p>
            </div>
          </div>
        )}
        <p className="mt-3 text-[11px] text-muted">
          Based on {performance.positionsAnalyzed} top position{performance.positionsAnalyzed === 1 ? "" : "s"} by
          disclosed dollar amount{performance.positionsSkipped > 0 ? ` (${performance.positionsSkipped} skipped — insufficient price history)` : ""}.
        </p>
      </Panel>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Exposure by ticker" className="lg:col-span-1">
          <HoldingsPie
            data={portfolio.map((row) => ({ ticker: row.ticker, value: row.buyTotal + row.sellTotal }))}
          />
          <p className="mt-2 text-center text-[11px] text-muted">
            Slice size = total disclosed buy + sell activity per ticker, not a current holding value.
          </p>
        </Panel>

      <Panel title="Estimated portfolio (by disclosed activity)" className="lg:col-span-2">
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
      </div>

      <Panel title="Full trade history" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-panel-border text-xs text-muted">
                <th className="pb-2 pr-4 font-normal">Ticker</th>
                <th className="pb-2 pr-4 font-normal">Direction</th>
                <th className="pb-2 pr-4 font-normal">Amount range</th>
                <th className="pb-2 pr-4 font-normal">Transaction date</th>
                <th className="pb-2 font-normal">Source filing</th>
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
                    <td className="py-2">
                      <a
                        href={trade.ptrLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline"
                      >
                        View PTR
                      </a>
                    </td>
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
