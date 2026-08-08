import { requireActiveSubscription } from "@/lib/subscription-guard";
import { getUpcomingEarnings } from "@/lib/earnings-calendar";
import { Panel } from "@/components/Panel";
import { Disclaimer } from "@/components/Disclaimer";
import { MonthCalendar, type CalendarEvent } from "@/components/MonthCalendar";
import { PageHeader } from "@/components/PageHeader";

function parseMonth(month?: string): Date {
  if (month) {
    const [y, m] = month.split("-").map(Number);
    if (y && m) return new Date(y, m - 1, 1);
  }
  return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
}

export default async function EarningsCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireActiveSubscription();

  const { month } = await searchParams;
  const monthDate = parseMonth(month);
  const earnings = await getUpcomingEarnings();

  const events: CalendarEvent[] = earnings.map((e) => ({
    date: e.estimatedDate,
    ticker: e.ticker,
    primary: e.epsEstimate !== null ? `$${e.epsEstimate.toFixed(2)}` : "Report",
    secondary: "Est. EPS",
    tone: "accent",
  }));

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader
        title="Earnings Calendar"
        description="Estimated next-report dates, projected from each company's standard quarterly cadence — an estimate, not a confirmed company announcement."
      />

      <Panel className="mt-6">
        <MonthCalendar monthDate={monthDate} events={events} basePath="/earnings-calendar" />
      </Panel>

      <div className="mt-6">
        <Disclaimer />
      </div>
    </div>
  );
}
