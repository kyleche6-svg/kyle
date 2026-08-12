import Link from "next/link";
import { requireActiveSubscription } from "@/lib/subscription-guard";
import { getReturnRankings } from "@/lib/return-rankings";
import { TRENDING_TICKERS } from "@/lib/stocks";
import { Panel } from "@/components/Panel";
import { Disclaimer } from "@/components/Disclaimer";
import { PageHeader } from "@/components/PageHeader";
import { ChangeBar } from "@/components/ChangeBar";

const WINDOW_LABELS = ["1 month", "3 months", "6 months", "1 year"] as const;
type WindowLabel = (typeof WINDOW_LABELS)[number];

// Fans out to ~51 tickers on a cache miss (see getReturnRankings) — give
// it real headroom above the platform default so a cold cache doesn't
// risk a function timeout.
export const maxDuration = 30;

function formatPct(value: number | null, digits = 1) {
  return value === null ? "—" : `${value >= 0 ? "+" : ""}${(value * 100).toFixed(digits)}%`;
}

export default async function ReturnRankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  await requireActiveSubscription();

  const { window: windowParam } = await searchParams;
  const activeWindow: WindowLabel = WINDOW_LABELS.includes(windowParam as WindowLabel)
    ? (windowParam as WindowLabel)
    : "1 year";

  const rankings = await getReturnRankings();

  const rows = rankings
    .map((r) => ({
      ticker: r.ticker,
      companyName: r.companyName,
      stats: r.windows.find((w) => w.label === activeWindow) ?? null,
    }))
    .filter((r) => r.stats && r.stats.positiveFrequency !== null)
    .sort((a, b) => (b.stats!.positiveFrequency ?? 0) - (a.stats!.positiveFrequency ?? 0));

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader
        title="Return Probability Rankings"
        description={`Ranking the ${TRENDING_TICKERS.length} large-cap stocks this app tracks by how often their real historical rolling-window returns came out positive — not a full-market screener (that requires a paid data plan we don't use) and never a prediction: this describes what already happened, not what will happen next.`}
      />

      <div className="mt-6 flex flex-wrap gap-2">
        {WINDOW_LABELS.map((w) => (
          <Link
            key={w}
            href={`/return-rankings?window=${encodeURIComponent(w)}`}
            prefetch={false}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              w === activeWindow
                ? "border-accent text-accent"
                : "border-panel-border text-muted hover:text-foreground"
            }`}
          >
            {w}
          </Link>
        ))}
      </div>

      <Panel className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-panel-border text-xs text-muted">
                <th className="pb-2 pr-4 font-normal">Rank</th>
                <th className="pb-2 pr-4 font-normal">Ticker</th>
                <th className="pb-2 pr-4 font-normal">Company</th>
                <th className="pb-2 pr-4 font-normal">Positive periods ({activeWindow})</th>
                <th className="pb-2 pr-4 font-normal">Mean return</th>
                <th className="pb-2 pr-4 font-normal">Std. deviation</th>
                <th className="pb-2 font-normal">Sample size</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const stats = row.stats!;
                const pct = (stats.positiveFrequency ?? 0) * 100;
                return (
                  <tr key={row.ticker} className="border-b border-panel-border/50 transition-colors hover:bg-panel-border/20">
                    <td className="py-2.5 pr-4 font-mono text-xs text-muted tabular-nums">{i + 1}</td>
                    <td className="py-2.5 pr-4 font-mono font-medium">
                      <Link href={`/stocks/${row.ticker}`} prefetch={false} className="hover:text-accent">
                        {row.ticker}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4 text-muted">{row.companyName}</td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs tabular-nums text-positive">{pct.toFixed(0)}%</span>
                        <ChangeBar changePercent={pct} />
                      </div>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`font-mono text-xs tabular-nums ${(stats.mean ?? 0) >= 0 ? "text-positive" : "text-negative"}`}
                      >
                        {formatPct(stats.mean)}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs tabular-nums text-muted">
                      {stats.stdDev === null ? "—" : `${(stats.stdDev * 100).toFixed(1)}%`}
                    </td>
                    <td className="py-2.5 font-mono text-xs tabular-nums text-muted">{stats.sampleCount}</td>
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
