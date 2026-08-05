import { requireActiveSubscription } from "@/lib/subscription-guard";
import { CURRENCY_PAIRS, COMMODITIES, getQuote } from "@/lib/market-data";
import { getEconomicEvents } from "@/lib/economic-calendar";
import { Panel } from "@/components/Panel";
import { StatNumber } from "@/components/StatNumber";
import { EconomicCalendar } from "@/components/EconomicCalendar";
import { Disclaimer } from "@/components/Disclaimer";

function formatDelta(changePercent: number) {
  const sign = changePercent >= 0 ? "+" : "";
  return `${sign}${changePercent.toFixed(2)}%`;
}

export default async function DashboardPage() {
  await requireActiveSubscription();

  const [currencyQuotes, commodityQuotes, economicEvents] = await Promise.all([
    Promise.all(
      CURRENCY_PAIRS.map((pair) => getQuote(pair.symbol, pair.label, pair.basePrice)),
    ),
    Promise.all(
      COMMODITIES.map((c) => getQuote(c.symbol, c.label, c.basePrice)),
    ),
    getEconomicEvents(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Market Dashboard</h1>
        <p className="text-xs text-muted">Refreshed on an interval, not live-polled per request.</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-[repeat(7,minmax(0,1fr))]">
        {currencyQuotes.map((quote) => (
          <Panel key={quote.symbol} title={quote.symbol}>
            <StatNumber
              label={`USD vs ${quote.label}`}
              value={quote.price.toFixed(3)}
              delta={formatDelta(quote.changePercent)}
            />
          </Panel>
        ))}
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

      <div className="mt-6 flex items-baseline justify-between">
        <h2 className="text-lg font-medium">Economic Calendar</h2>
        <p className="text-xs text-muted">
          High-impact events, forecast vs. actual — mock data, real ingestion is a planned follow-up.
        </p>
      </div>
      <Panel className="mt-3">
        <EconomicCalendar events={economicEvents} />
      </Panel>

      <div className="mt-6">
        <Disclaimer />
      </div>
    </div>
  );
}
