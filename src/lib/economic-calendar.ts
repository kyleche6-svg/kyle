// Real economic calendar — sourced live from FRED (Federal Reserve Economic
// Data), the St. Louis Fed's own free API. Release dates come from FRED's
// official publication schedule (fred/release/dates); actual/previous
// values come from the representative series for each release. FRED is
// free forever with no paid tier gate (unlike FMP's economic-calendar
// endpoint, which turned out to require a paid plan), but it only covers
// U.S. releases and never has consensus forecasts — no free source
// publishes forecasts, so "forecast" is always null here rather than
// fabricated.
const FRED_BASE = "https://api.stlouisfed.org/fred";
const CACHE_SECONDS = 3600; // release schedules don't change intraday

export type EventImpact = "high" | "medium" | "low";

export type EconomicEvent = {
  id: string;
  eventName: string;
  currency: string;
  impact: EventImpact;
  eventTime: Date;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
};

type TrackedRelease = {
  releaseId: number;
  eventName: string;
  impact: EventImpact;
  seriesId: string;
  units: string;
  format: (value: number) => string;
};

// Curated to releases that are genuinely periodic and newsworthy — FRED's
// own catalog includes hundreds of low-interest series. Deliberately
// excludes anything tied to FOMC meeting dates specifically (e.g. the Fed
// funds rate) — FRED's interest-rate release publishes daily, not on the
// ~8-times-a-year meeting schedule, so treating it as a "rate decision"
// event would misrepresent it as happening far more often than it does.
const TRACKED_RELEASES: TrackedRelease[] = [
  {
    releaseId: 10,
    eventName: "CPI m/m",
    impact: "high",
    seriesId: "CPIAUCSL",
    units: "pch",
    format: (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`,
  },
  {
    releaseId: 50,
    eventName: "Non-Farm Payrolls",
    impact: "high",
    seriesId: "PAYEMS",
    units: "chg",
    format: (v) => `${v >= 0 ? "+" : ""}${v.toFixed(0)}K`,
  },
  {
    releaseId: 50,
    eventName: "Unemployment Rate",
    impact: "medium",
    seriesId: "UNRATE",
    units: "lin",
    format: (v) => `${v.toFixed(1)}%`,
  },
  {
    releaseId: 53,
    eventName: "GDP q/q",
    impact: "high",
    seriesId: "GDPC1",
    units: "pch",
    format: (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`,
  },
  {
    releaseId: 9,
    eventName: "Retail Sales m/m",
    impact: "medium",
    seriesId: "RSAFS",
    units: "pch",
    format: (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`,
  },
  {
    releaseId: 180,
    eventName: "Initial Jobless Claims",
    impact: "low",
    seriesId: "ICSA",
    units: "lin",
    format: (v) => `${Math.round(v / 1000)}K`,
  },
];

async function fredJson(path: string) {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(`${FRED_BASE}${path}${path.includes("?") ? "&" : "?"}api_key=${apiKey}&file_type=json`, {
      next: { revalidate: CACHE_SECONDS },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getReleaseDates(releaseId: number, from: string, to: string): Promise<string[]> {
  const data = await fredJson(
    `/release/dates?release_id=${releaseId}&realtime_start=${from}&realtime_end=${to}&include_release_dates_with_no_data=true&sort_order=asc`,
  );
  const dates: { date: string }[] = data?.release_dates ?? [];
  return dates.map((d) => d.date);
}

async function getLatestObservations(seriesId: string, units: string): Promise<{ date: string; value: number }[]> {
  const data = await fredJson(`/series/observations?series_id=${seriesId}&units=${units}&sort_order=desc&limit=3`);
  const obs: { date: string; value: string }[] = data?.observations ?? [];
  return obs
    .map((o) => ({ date: o.date, value: parseFloat(o.value) }))
    .filter((o) => Number.isFinite(o.value));
}

export async function getEconomicEvents(): Promise<EconomicEvent[]> {
  if (!process.env.FRED_API_KEY) return [];

  const from = new Date();
  from.setDate(from.getDate() - 5);
  const to = new Date();
  to.setDate(to.getDate() + 35);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const now = new Date();

  const events: EconomicEvent[] = [];

  for (const release of TRACKED_RELEASES) {
    const [dates, observations] = await Promise.all([
      getReleaseDates(release.releaseId, fmt(from), fmt(to)),
      getLatestObservations(release.seriesId, release.units),
    ]);

    // Only the release closest to today in each direction — FRED lists
    // every future date for the next several months, which would flood the
    // calendar with the same event repeated many times.
    const past = dates.filter((d) => new Date(d) <= now).sort().at(-1);
    const upcoming = dates.filter((d) => new Date(d) > now).sort()[0];
    const relevantDates = [past, upcoming].filter((d): d is string => !!d);

    for (const dateStr of relevantDates) {
      const isPast = new Date(dateStr) <= now;
      const actual = isPast && observations[0] ? release.format(observations[0].value) : null;
      const previous = isPast
        ? observations[1]
          ? release.format(observations[1].value)
          : null
        : observations[0]
          ? release.format(observations[0].value)
          : null;

      // Nominal 8:30am ET — the real convention for BLS/BEA/Census releases
      // this app tracks, but FRED's own date field carries no time-of-day,
      // so this is a typical-schedule label, not a value FRED asserts.
      const eventTime = new Date(`${dateStr}T12:30:00.000Z`);

      events.push({
        id: `${release.releaseId}-${release.seriesId}-${dateStr}`,
        eventName: release.eventName,
        currency: "USD",
        impact: release.impact,
        eventTime,
        actual,
        forecast: null,
        previous,
      });
    }
  }

  return events.sort((a, b) => a.eventTime.getTime() - b.eventTime.getTime());
}
