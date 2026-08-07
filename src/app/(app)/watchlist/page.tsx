import Link from "next/link";
import { TrendUp, TrendDown, BellRinging } from "@phosphor-icons/react/dist/ssr";
import { requireActiveSubscription } from "@/lib/subscription-guard";
import { prisma } from "@/lib/prisma";
import { getQuote } from "@/lib/market-data";
import { TRENDING_TICKERS } from "@/lib/stocks";
import { checkAndUpdateAlerts } from "@/lib/price-alerts";
import { removeFromWatchlist } from "@/app/actions/watchlist";
import { deletePriceAlert } from "@/app/actions/alerts";
import { Panel } from "@/components/Panel";
import { AddWatchlistForm } from "@/components/AddWatchlistForm";
import { AddAlertForm } from "@/components/AddAlertForm";
import { RemoveButton } from "@/components/RemoveButton";
import { Disclaimer } from "@/components/Disclaimer";

function formatDelta(changePercent: number) {
  const sign = changePercent >= 0 ? "+" : "";
  return `${sign}${changePercent.toFixed(2)}%`;
}

export default async function WatchlistPage() {
  const { userId } = await requireActiveSubscription();

  const [watchlistItems, alerts] = await Promise.all([
    prisma.watchlistItem.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    checkAndUpdateAlerts(userId),
  ]);

  const quotes = await Promise.all(
    watchlistItems.map((item) => {
      const trending = TRENDING_TICKERS.find((t) => t.ticker === item.ticker);
      return getQuote(item.ticker, trending?.companyName ?? item.ticker, trending?.basePrice ?? 100);
    }),
  );

  const activeAlerts = alerts.filter((a) => !a.triggered);
  const triggeredAlerts = alerts.filter((a) => a.triggered);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="animate-sprint-in-left text-2xl font-semibold">Watchlist</h1>
      <p className="mt-1 text-sm text-muted">
        Stocks you&apos;re tracking, and price alerts checked whenever you view this page.
      </p>

      <Panel title="Your watchlist" className="mt-6">
        <AddWatchlistForm />
        {watchlistItems.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Nothing here yet — add a ticker above.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-panel-border text-xs text-muted">
                  <th className="pb-2 pr-4 font-normal">Ticker</th>
                  <th className="pb-2 pr-4 font-normal">Price</th>
                  <th className="pb-2 pr-4 font-normal">Change</th>
                  <th className="pb-2 font-normal"></th>
                </tr>
              </thead>
              <tbody>
                {watchlistItems.map((item, i) => {
                  const quote = quotes[i];
                  const isPositive = quote.changePercent >= 0;
                  return (
                    <tr key={item.id} className="border-b border-panel-border/50">
                      <td className="py-2.5 pr-4 font-mono font-medium">
                        <Link href={`/stocks/${item.ticker}`} className="hover:text-accent">
                          {item.ticker}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4 font-mono tabular-nums">${quote.price.toFixed(2)}</td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={`flex items-center gap-1 font-mono text-xs tabular-nums ${
                            isPositive ? "text-positive" : "text-negative"
                          }`}
                        >
                          {isPositive ? <TrendUp size={12} weight="bold" /> : <TrendDown size={12} weight="bold" />}
                          {formatDelta(quote.changePercent)}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <RemoveButton action={removeFromWatchlist.bind(null, item.id)} label={`Remove ${item.ticker}`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Price alerts" className="mt-4">
        <AddAlertForm />

        {activeAlerts.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-xs text-muted">Watching</p>
            {activeAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between rounded-md border border-panel-border px-3 py-2 text-sm">
                <span>
                  <span className="font-mono font-medium">{alert.ticker}</span>{" "}
                  <span className="text-muted">
                    {alert.direction === "above" ? "goes above" : "goes below"} ${alert.targetPrice.toFixed(2)}
                  </span>
                </span>
                <RemoveButton action={deletePriceAlert.bind(null, alert.id)} label={`Remove alert for ${alert.ticker}`} />
              </div>
            ))}
          </div>
        )}

        {triggeredAlerts.length > 0 && (
          <div className="mt-4 flex flex-col gap-2 border-t border-panel-border pt-4">
            <p className="flex items-center gap-1.5 text-xs text-accent">
              <BellRinging size={13} weight="fill" /> Triggered
            </p>
            {triggeredAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-sm">
                <span>
                  <span className="font-mono font-medium">{alert.ticker}</span>{" "}
                  <span className="text-muted">
                    {alert.direction === "above" ? "went above" : "went below"} ${alert.targetPrice.toFixed(2)}
                  </span>
                </span>
                <RemoveButton action={deletePriceAlert.bind(null, alert.id)} label={`Remove alert for ${alert.ticker}`} />
              </div>
            ))}
          </div>
        )}

        {alerts.length === 0 && <p className="mt-4 text-sm text-muted">No alerts set.</p>}
      </Panel>

      <div className="mt-6">
        <Disclaimer />
      </div>
    </div>
  );
}
