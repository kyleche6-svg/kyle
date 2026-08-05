import { requireActiveSubscription } from "@/lib/subscription-guard";
import { getRecentTrades, getMonthlyBuyLeaderboard } from "@/lib/trades";
import { Panel } from "@/components/Panel";
import { Disclaimer } from "@/components/Disclaimer";

function formatAmountRange(low: number, high: number) {
  const fmt = (n: number) => `$${n.toLocaleString()}`;
  return `${fmt(low)} – ${fmt(high)}`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function PoliticiansPage() {
  await requireActiveSubscription();

  const [trades, leaderboard] = await Promise.all([
    getRecentTrades(),
    getMonthlyBuyLeaderboard(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Politician Trading Tracker</h1>
      <p className="mt-1 text-sm text-muted">
        Public congressional stock trade disclosures. Mock data — real
        ingestion from Senate eFD filings is a planned follow-up.
      </p>

      <Panel title="Most bought this month" className="mt-6">
        {leaderboard.length === 0 ? (
          <p className="text-sm text-muted">No buys recorded this month.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {leaderboard.map((row, i) => (
              <div key={row.ticker} className="rounded-md border border-panel-border p-3">
                <p className="text-xs text-muted">#{i + 1}</p>
                <p className="mt-1 font-medium">{row.ticker}</p>
                <p className="text-xs text-accent">{row.buyCount} buys</p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Recent filings" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-panel-border text-xs text-muted">
                <th className="pb-2 pr-4 font-normal">Politician</th>
                <th className="pb-2 pr-4 font-normal">Ticker</th>
                <th className="pb-2 pr-4 font-normal">Direction</th>
                <th className="pb-2 pr-4 font-normal">Amount range</th>
                <th className="pb-2 pr-4 font-normal">Transaction date</th>
                <th className="pb-2 font-normal">Filed date</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.id} className="border-b border-panel-border/50">
                  <td className="py-2 pr-4">{trade.politicianName}</td>
                  <td className="py-2 pr-4 font-medium">{trade.ticker}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={
                        trade.direction === "buy" ? "text-emerald-400" : "text-red-400"
                      }
                    >
                      {trade.direction}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-muted">
                    {formatAmountRange(trade.amountRangeLow, trade.amountRangeHigh)}
                  </td>
                  <td className="py-2 pr-4 text-muted">
                    {formatDate(trade.transactionDate)}
                  </td>
                  <td className="py-2 text-muted">{formatDate(trade.filedDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="mt-8">
        <Disclaimer />
      </div>
    </div>
  );
}
