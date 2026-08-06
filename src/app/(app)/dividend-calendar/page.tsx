import Link from "next/link";
import { requireActiveSubscription } from "@/lib/subscription-guard";
import { getUpcomingDividends } from "@/lib/dividend-calendar";
import { Panel } from "@/components/Panel";
import { Disclaimer } from "@/components/Disclaimer";

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function daysUntil(date: Date) {
  const days = Math.round((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

export default async function DividendCalendarPage() {
  await requireActiveSubscription();

  const dividends = await getUpcomingDividends();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-semibold">Dividend Calendar</h1>
      <p className="mt-1 text-sm text-muted">
        Estimated upcoming ex-dividend dates and per-share amounts. Companies that don&apos;t
        currently pay a dividend aren&apos;t listed.
      </p>

      <Panel className="mt-6">
        {dividends.length === 0 ? (
          <p className="text-sm text-muted">No upcoming dividends found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-panel-border text-xs text-muted">
                  <th className="pb-2 pr-4 font-normal">Ticker</th>
                  <th className="pb-2 pr-4 font-normal">Company</th>
                  <th className="pb-2 pr-4 font-normal">Ex-date</th>
                  <th className="pb-2 pr-4 font-normal">Countdown</th>
                  <th className="pb-2 font-normal">Amount / share</th>
                </tr>
              </thead>
              <tbody>
                {dividends.map((d) => (
                  <tr key={d.ticker} className="border-b border-panel-border/50">
                    <td className="py-2.5 pr-4 font-mono font-medium">
                      <Link href={`/stocks/${d.ticker}`} className="hover:text-accent">
                        {d.ticker}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4 text-muted">{d.companyName}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs tabular-nums">{formatDate(d.exDate)}</td>
                    <td className="py-2.5 pr-4 text-xs text-accent">{daysUntil(d.exDate)}</td>
                    <td className="py-2.5 font-mono text-xs tabular-nums text-muted">${d.amount.toFixed(2)}</td>
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
