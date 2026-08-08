import { requireActiveSubscription } from "@/lib/subscription-guard";
import { getUpcomingDividends } from "@/lib/dividend-calendar";
import { Panel } from "@/components/Panel";
import { Disclaimer } from "@/components/Disclaimer";
import { MonthCalendar, type CalendarEvent } from "@/components/MonthCalendar";

function parseMonth(month?: string): Date {
  if (month) {
    const [y, m] = month.split("-").map(Number);
    if (y && m) return new Date(y, m - 1, 1);
  }
  return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
}

export default async function DividendCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireActiveSubscription();

  const { month } = await searchParams;
  const monthDate = parseMonth(month);
  const dividends = await getUpcomingDividends();

  const events: CalendarEvent[] = dividends.map((d) => ({
    date: d.exDate,
    ticker: d.ticker,
    primary: `$${d.amount.toFixed(2)}`,
    secondary: "Per share",
    tone: "positive",
  }));

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-semibold">Dividend Calendar</h1>
      <p className="mt-1 text-sm text-muted">
        Estimated upcoming ex-dividend dates and per-share amounts. Companies that don&apos;t
        currently pay a dividend aren&apos;t listed.
      </p>

      <Panel className="mt-6">
        <MonthCalendar monthDate={monthDate} events={events} basePath="/dividend-calendar" />
      </Panel>

      <div className="mt-6">
        <Disclaimer />
      </div>
    </div>
  );
}
