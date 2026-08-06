import Link from "next/link";
import { TrendUp, TrendDown, Users } from "@phosphor-icons/react/dist/ssr";
import { requireActiveSubscription } from "@/lib/subscription-guard";
import { getRecentRealTrades, getRealMonthlyBuyLeaderboard, getAllRealPoliticians } from "@/lib/real-trades";
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

  const [trades, leaderboard, allPoliticians] = await Promise.all([
    getRecentRealTrades(75),
    getRealMonthlyBuyLeaderboard(),
    getAllRealPoliticians(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-semibold">Senate Trading Tracker</h1>
      <p className="mt-1 text-sm text-muted">
        Real stock-trade disclosures filed by US Senators under the STOCK
        Act, scraped directly from efdsearch.senate.gov — the Senate&apos;s own
        live disclosure search system, not a stale third-party mirror. Senate
        only — no reliable free House disclosure feed exists. The STOCK Act
        gives filers up to 45 days to disclose a trade, so a filing here is
        current as of that legal window, not real-time. Data reflects the
        last scrape run, not a live feed.
      </p>

      <Panel title="Most bought this month" className="mt-6">
        {leaderboard.length === 0 ? (
          <p className="text-sm text-muted">No buys recorded this month.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {leaderboard.map((row, i) => (
              <div key={row.ticker} className="rounded-md border border-panel-border p-3">
                <p className="text-xs text-muted">#{i + 1}</p>
                <p className="mt-1 font-mono font-medium">{row.ticker}</p>
                <p className="text-xs text-positive">{row.buyCount} buys</p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title={`All politicians (${allPoliticians.length})`} className="mt-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {allPoliticians.map((politician) => (
            <Link
              key={politician.name}
              href={`/politicians/${encodeURIComponent(politician.name)}`}
              className="flex items-center justify-between rounded-md border border-panel-border px-3 py-2 text-sm transition-colors hover:border-accent hover:text-accent"
            >
              <span className="flex items-center gap-2">
                <Users size={14} className="text-muted" />
                {politician.name}
              </span>
              <span className="font-mono text-xs text-muted">{politician.tradeCount} trades</span>
            </Link>
          ))}
        </div>
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
                <th className="pb-2 font-normal">Source</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => {
                const isBuy = trade.direction === "buy";
                return (
                  <tr key={trade.id} className="border-b border-panel-border/50">
                    <td className="py-2 pr-4">
                      <Link
                        href={`/politicians/${encodeURIComponent(trade.politicianName)}`}
                        className="hover:text-accent"
                      >
                        {trade.politicianName}
                      </Link>
                    </td>
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
                    <td className="py-2 pr-4 text-muted">
                      {formatDate(trade.transactionDate)}
                    </td>
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
