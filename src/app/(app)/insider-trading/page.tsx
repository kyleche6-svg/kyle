import Link from "next/link";
import { TrendUp, TrendDown, Minus } from "@phosphor-icons/react/dist/ssr";
import { requireActiveSubscription } from "@/lib/subscription-guard";
import { getInsiderTrades } from "@/lib/insider-trading";
import { Panel } from "@/components/Panel";
import { Disclaimer } from "@/components/Disclaimer";

function formatUsd(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default async function InsiderTradingPage() {
  await requireActiveSubscription();

  const trades = await getInsiderTrades(300);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="animate-sprint-in-left text-2xl font-semibold">Insider Trading</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        Every SEC Form 4 filing from a full day, backfilled from SEC&apos;s daily index — company
        officers, directors, and 10%+ owners disclosing trades in their own company&apos;s stock, no
        filtering by name or company. Insiders must file within 2 business days of a transaction, so
        this reflects that window, not real-time.
      </p>

      <Panel title={`Recent filings (${trades.length})`} className="mt-6">
        {trades.length === 0 ? (
          <p className="text-sm text-muted">No recent filings could be loaded — try again shortly.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-panel-border text-xs text-muted">
                  <th className="pb-2 pr-4 font-normal">Ticker</th>
                  <th className="pb-2 pr-4 font-normal">Insider</th>
                  <th className="pb-2 pr-4 font-normal">Relationship</th>
                  <th className="pb-2 pr-4 font-normal">Transaction</th>
                  <th className="pb-2 pr-4 font-normal">Shares</th>
                  <th className="pb-2 pr-4 font-normal">Price</th>
                  <th className="pb-2 font-normal">Filed</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade, i) => (
                  <tr key={i} className="border-b border-panel-border/50">
                    <td className="py-2 pr-4 font-mono font-medium">
                      <Link href={`/stocks/${trade.ticker}`} className="hover:text-accent">
                        {trade.ticker}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">{trade.ownerName}</td>
                    <td className="py-2 pr-4 text-xs text-muted">{trade.relationship}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`flex items-center gap-1 text-xs ${
                          trade.direction === "buy"
                            ? "text-positive"
                            : trade.direction === "sell"
                              ? "text-negative"
                              : "text-muted"
                        }`}
                      >
                        {trade.direction === "buy" ? (
                          <TrendUp size={12} weight="bold" />
                        ) : trade.direction === "sell" ? (
                          <TrendDown size={12} weight="bold" />
                        ) : (
                          <Minus size={12} weight="bold" />
                        )}
                        {trade.transactionCode}
                      </span>
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs tabular-nums">
                      {trade.shares.toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs tabular-nums text-muted">
                      {trade.pricePerShare ? formatUsd(trade.pricePerShare) : "—"}
                    </td>
                    <td className="py-2 text-xs text-muted">{trade.filedDate}</td>
                  </tr>
                ))}
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
