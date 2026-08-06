import Link from "next/link";
import { requireActiveSubscription } from "@/lib/subscription-guard";
import { getUpcomingEarnings } from "@/lib/earnings-calendar";
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

export default async function EarningsCalendarPage() {
  await requireActiveSubscription();

  const earnings = await getUpcomingEarnings();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-semibold">Earnings Calendar</h1>
      <p className="mt-1 text-sm text-muted">
        Estimated next-report dates, projected from each company&apos;s standard quarterly cadence —
        an estimate, not a confirmed company announcement.
      </p>

      <Panel className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-panel-border text-xs text-muted">
                <th className="pb-2 pr-4 font-normal">Ticker</th>
                <th className="pb-2 pr-4 font-normal">Company</th>
                <th className="pb-2 pr-4 font-normal">Est. date</th>
                <th className="pb-2 pr-4 font-normal">Countdown</th>
                <th className="pb-2 font-normal">EPS estimate</th>
              </tr>
            </thead>
            <tbody>
              {earnings.map((e) => (
                <tr key={e.ticker} className="border-b border-panel-border/50">
                  <td className="py-2.5 pr-4 font-mono font-medium">
                    <Link href={`/stocks/${e.ticker}`} className="hover:text-accent">
                      {e.ticker}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4 text-muted">{e.companyName}</td>
                  <td className="py-2.5 pr-4 font-mono text-xs tabular-nums">{formatDate(e.estimatedDate)}</td>
                  <td className="py-2.5 pr-4 text-xs text-accent">{daysUntil(e.estimatedDate)}</td>
                  <td className="py-2.5 font-mono text-xs tabular-nums text-muted">
                    {e.epsEstimate !== null ? `$${e.epsEstimate.toFixed(2)}` : "—"}
                  </td>
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
