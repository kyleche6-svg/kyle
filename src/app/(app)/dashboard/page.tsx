import { requireActiveSubscription } from "@/lib/subscription-guard";
import {
  CURRENCY_PAIRS,
  COMMODITIES,
  getUsdIndexQuote,
  getUsdIndexSeries,
  getQuote,
} from "@/lib/market-data";
import { Panel } from "@/components/Panel";
import { StatNumber } from "@/components/StatNumber";
import { PriceChart } from "@/components/PriceChart";
import { Disclaimer } from "@/components/Disclaimer";

function formatDelta(changePercent: number) {
  const sign = changePercent >= 0 ? "+" : "";
  return `${sign}${changePercent.toFixed(2)}%`;
}

export default async function DashboardPage() {
  await requireActiveSubscription();

  const [dxyQuote, dxySeries, currencyQuotes, commodityQuotes] = await Promise.all([
    getUsdIndexQuote(),
    getUsdIndexSeries(),
    Promise.all(
      CURRENCY_PAIRS.map((pair) => getQuote(pair.symbol, pair.label, pair.basePrice)),
    ),
    Promise.all(
      COMMODITIES.map((c) => getQuote(c.symbol, c.label, c.basePrice)),
    ),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold">USD Strength Dashboard</h1>
      <p className="mt-1 text-sm text-muted">
        Refreshed on an interval, not live-polled per request.
      </p>

      <Panel title="USD Index (DXY-style)" className="mt-6">
        <StatNumber
          label="Index level"
          value={dxyQuote.price.toFixed(2)}
          delta={formatDelta(dxyQuote.changePercent)}
          accent
        />
        <div className="mt-4">
          <PriceChart data={dxySeries} />
        </div>
      </Panel>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {currencyQuotes.map((quote) => (
          <Panel key={quote.symbol} title={quote.symbol}>
            <StatNumber
              label={`USD vs ${quote.label}`}
              value={quote.price.toFixed(3)}
              delta={formatDelta(quote.changePercent)}
            />
          </Panel>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-medium">Commodities (priced in USD)</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {commodityQuotes.map((quote) => (
          <Panel key={quote.symbol} title={quote.label}>
            <StatNumber
              label={quote.symbol}
              value={`$${quote.price.toFixed(2)}`}
              delta={formatDelta(quote.changePercent)}
            />
          </Panel>
        ))}
      </div>

      <div className="mt-8">
        <Disclaimer />
      </div>
    </div>
  );
}
