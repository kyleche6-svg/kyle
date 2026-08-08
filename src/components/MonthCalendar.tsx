import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";

export type CalendarEvent = {
  date: Date;
  ticker: string;
  primary: string;
  secondary?: string;
  tone?: "accent" | "positive" | "negative" | "muted";
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TONE_CLASS: Record<NonNullable<CalendarEvent["tone"]>, string> = {
  accent: "border-accent/40 bg-accent/10 text-accent",
  positive: "border-positive/40 bg-positive/10 text-positive",
  negative: "border-negative/40 bg-negative/10 text-negative",
  muted: "border-panel-border bg-panel text-muted",
};

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function monthParam(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function MonthCalendar({
  monthDate,
  events,
  basePath,
}: {
  monthDate: Date;
  events: CalendarEvent[];
  basePath: string;
}) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayKey = toDateKey(today);

  const eventsByDay = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const key = toDateKey(e.date);
    const list = eventsByDay.get(key) ?? [];
    list.push(e);
    eventsByDay.set(key, list);
  }

  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = new Date(year, month - 1, 1);
  const nextMonth = new Date(year, month + 1, 1);
  const monthLabel = monthDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`${basePath}?month=${monthParam(prevMonth)}`}
          className="flex items-center gap-1 rounded-md border border-panel-border px-2.5 py-1.5 text-xs text-muted transition-colors hover:text-foreground"
        >
          <CaretLeft size={12} /> Prev
        </Link>
        <p className="text-sm font-medium">{monthLabel}</p>
        <Link
          href={`${basePath}?month=${monthParam(nextMonth)}`}
          className="flex items-center gap-1 rounded-md border border-panel-border px-2.5 py-1.5 text-xs text-muted transition-colors hover:text-foreground"
        >
          Next <CaretRight size={12} />
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-muted uppercase">
        {WEEKDAYS.map((w) => (
          <div key={w} className="pb-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={`blank-${i}`} className="min-h-24 rounded-md" />;
          const cellDate = new Date(year, month, day);
          const key = toDateKey(cellDate);
          const dayEvents = eventsByDay.get(key) ?? [];
          const isToday = key === todayKey;

          return (
            <div
              key={key}
              className={`min-h-24 rounded-md border p-1.5 ${isToday ? "border-accent/50 bg-accent/5" : "border-panel-border bg-panel/40"}`}
            >
              <p className={`mb-1 text-[11px] font-mono ${isToday ? "font-semibold text-accent" : "text-muted"}`}>
                {day}
              </p>
              <div className="flex flex-col gap-1">
                {dayEvents.slice(0, 3).map((e, idx) => (
                  <Link
                    key={`${e.ticker}-${idx}`}
                    href={`/stocks/${e.ticker}`}
                    prefetch={false}
                    className={`block truncate rounded border px-1 py-0.5 text-[10px] font-medium ${TONE_CLASS[e.tone ?? "muted"]}`}
                    title={`${e.ticker} — ${e.primary}${e.secondary ? ` (${e.secondary})` : ""}`}
                  >
                    {e.ticker} {e.primary}
                  </Link>
                ))}
                {dayEvents.length > 3 && (
                  <p className="text-[10px] text-muted">+{dayEvents.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
