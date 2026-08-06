import Link from "next/link";
import { TrendUp, TrendDown } from "@phosphor-icons/react/dist/ssr";
import { requireActiveSubscription } from "@/lib/subscription-guard";
import { prisma } from "@/lib/prisma";
import { getQuote } from "@/lib/market-data";
import { TRENDING_TICKERS } from "@/lib/stocks";
import { deletePortfolioHolding } from "@/app/actions/portfolio";
import { Panel } from "@/components/Panel";
import { StatNumber } from "@/components/StatNumber";
import { AddHoldingForm } from "@/components/AddHoldingForm";
import { RemoveButton } from "@/components/RemoveButton";
import { Disclaimer } from "@/components/Disclaimer";

function formatUsd(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function PortfolioPage() {
  const { userId } = await requireActiveSubscription();

  const holdings = await prisma.portfolioHolding.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const quotes = await Promise.all(
    holdings.map((h) => {
      const trending = TRENDING_TICKERS.find((t) => t.ticker === h.ticker);
      return getQuote(h.ticker, trending?.companyName ?? h.ticker, trending?.basePrice ?? h.costBasis);
    }),
  );

  const rows = holdings.map((h, i) => {
    const currentPrice = quotes[i].price;
    const marketValue = currentPrice * h.shares;
    const costValue = h.costBasis * h.shares;
    const gainLoss = marketValue - costValue;
    const gainLossPercent = costValue > 0 ? (gainLoss / costValue) * 100 : 0;
    return { ...h, currentPrice, marketValue, costValue, gainLoss, gainLossPercent };
  });

  const totalValue = rows.reduce((sum, r) => sum + r.marketValue, 0);
  const totalCost = rows.reduce((sum, r) => sum + r.costValue, 0);
  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-semibold">Portfolio Tracker</h1>
      <p className="mt-1 text-sm text-muted">
        Manually entered holdings, tracked against live prices. A calculator — nothing here is
        pulled from a brokerage or verified, and it&apos;s not a recommendation about what to hold.
      </p>

      {holdings.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Panel>
            <StatNumber label="Total value" value={formatUsd(totalValue)} />
          </Panel>
          <Panel>
            <StatNumber label="Total cost basis" value={formatUsd(totalCost)} />
          </Panel>
          <Panel>
            <StatNumber
              label="Total gain/loss"
              value={`${totalGainLoss >= 0 ? "+" : ""}${formatUsd(totalGainLoss)}`}
              delta={`${totalGainLossPercent >= 0 ? "+" : ""}${totalGainLossPercent.toFixed(1)}%`}
            />
          </Panel>
        </div>
      )}

      <Panel title="Holdings" className="mt-4">
        <AddHoldingForm />

        {rows.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No holdings yet — add one above.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-panel-border text-xs text-muted">
                  <th className="pb-2 pr-4 font-normal">Ticker</th>
                  <th className="pb-2 pr-4 font-normal">Shares</th>
                  <th className="pb-2 pr-4 font-normal">Cost/share</th>
                  <th className="pb-2 pr-4 font-normal">Current</th>
                  <th className="pb-2 pr-4 font-normal">Market value</th>
                  <th className="pb-2 pr-4 font-normal">Gain/loss</th>
                  <th className="pb-2 font-normal"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isPositive = row.gainLoss >= 0;
                  return (
                    <tr key={row.id} className="border-b border-panel-border/50">
                      <td className="py-2.5 pr-4 font-mono font-medium">
                        <Link href={`/stocks/${row.ticker}`} className="hover:text-accent">
                          {row.ticker}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4 font-mono tabular-nums">{row.shares}</td>
                      <td className="py-2.5 pr-4 font-mono tabular-nums">${row.costBasis.toFixed(2)}</td>
                      <td className="py-2.5 pr-4 font-mono tabular-nums">${row.currentPrice.toFixed(2)}</td>
                      <td className="py-2.5 pr-4 font-mono tabular-nums">{formatUsd(row.marketValue)}</td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={`flex items-center gap-1 font-mono text-xs tabular-nums ${
                            isPositive ? "text-positive" : "text-negative"
                          }`}
                        >
                          {isPositive ? <TrendUp size={12} weight="bold" /> : <TrendDown size={12} weight="bold" />}
                          {formatUsd(Math.abs(row.gainLoss))} ({row.gainLossPercent.toFixed(1)}%)
                        </span>
                      </td>
                      <td className="py-2.5">
                        <RemoveButton action={deletePortfolioHolding.bind(null, row.id)} label={`Remove ${row.ticker}`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="mt-6">
        <Disclaimer />
      </div>
    </div>
  );
}
