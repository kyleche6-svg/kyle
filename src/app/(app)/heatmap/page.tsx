import Link from "next/link";
import { requireActiveSubscription } from "@/lib/subscription-guard";
import { getStockList, getCompanyProfile, TRENDING_TICKERS } from "@/lib/stocks";
import { Panel } from "@/components/Panel";
import { Disclaimer } from "@/components/Disclaimer";

function heatColor(changePercent: number): string {
  const clamped = Math.max(-3, Math.min(3, changePercent));
  const intensity = Math.abs(clamped) / 3;
  const color = clamped >= 0 ? "34,197,94" : "239,68,68"; // positive / negative rgb
  return `rgba(${color}, ${0.12 + intensity * 0.45})`;
}

export default async function HeatmapPage() {
  await requireActiveSubscription();

  const stocks = await getStockList();
  const profiles = await Promise.all(
    stocks.map((s) => {
      const trending = TRENDING_TICKERS.find((t) => t.ticker === s.ticker);
      return getCompanyProfile(s.ticker, trending?.companyName ?? s.companyName);
    }),
  );

  const bySector = new Map<string, { ticker: string; companyName: string; changePercent: number }[]>();
  stocks.forEach((s, i) => {
    const sector = profiles[i].sector;
    const list = bySector.get(sector) ?? [];
    list.push({ ticker: s.ticker, companyName: s.companyName, changePercent: s.quote.changePercent });
    bySector.set(sector, list);
  });

  const sectors = Array.from(bySector.entries())
    .map(([sector, tickers]) => ({
      sector,
      tickers: tickers.sort((a, b) => b.changePercent - a.changePercent),
      avgChange: tickers.reduce((sum, t) => sum + t.changePercent, 0) / tickers.length,
    }))
    .sort((a, b) => b.avgChange - a.avgChange);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-semibold">Sector Heatmap</h1>
      <p className="mt-1 text-sm text-muted">
        Today&apos;s movers grouped by sector — real quotes, colored by change percent.
      </p>

      <div className="stagger-children mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {sectors.map((s) => (
          <Panel key={s.sector}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium">{s.sector}</h2>
              <span
                className={`font-mono text-xs tabular-nums ${s.avgChange >= 0 ? "text-positive" : "text-negative"}`}
              >
                avg {s.avgChange >= 0 ? "+" : ""}
                {s.avgChange.toFixed(2)}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {s.tickers.map((t) => (
                <Link
                  key={t.ticker}
                  href={`/stocks/${t.ticker}`}
                  className="rounded-md border border-panel-border p-2.5 transition-transform hover:-translate-y-0.5"
                  style={{ backgroundColor: heatColor(t.changePercent) }}
                >
                  <p className="font-mono text-sm font-semibold">{t.ticker}</p>
                  <p className="font-mono text-xs tabular-nums">
                    {t.changePercent >= 0 ? "+" : ""}
                    {t.changePercent.toFixed(2)}%
                  </p>
                </Link>
              ))}
            </div>
          </Panel>
        ))}
      </div>

      <div className="mt-6">
        <Disclaimer />
      </div>
    </div>
  );
}
