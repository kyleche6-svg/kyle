import { WarningCircle, WarningOctagon, Circle } from "@phosphor-icons/react/dist/ssr";
import type { EconomicEvent } from "@/generated/prisma/client";

const IMPACT_CONFIG = {
  high: { icon: WarningOctagon, className: "text-negative", label: "High" },
  medium: { icon: WarningCircle, className: "text-amber-400", label: "Medium" },
  low: { icon: Circle, className: "text-muted", label: "Low" },
} as const;

function formatEventTime(date: Date) {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const timeStr = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  if (isToday) return `Today, ${timeStr}`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  }) + `, ${timeStr}`;
}

export function EconomicCalendar({ events }: { events: EconomicEvent[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-panel-border text-xs text-muted">
            <th className="pb-2 pr-4 font-normal">Impact</th>
            <th className="pb-2 pr-4 font-normal">Event</th>
            <th className="pb-2 pr-4 font-normal">Currency</th>
            <th className="pb-2 pr-4 font-normal">Time</th>
            <th className="pb-2 pr-4 font-normal">Actual</th>
            <th className="pb-2 pr-4 font-normal">Forecast</th>
            <th className="pb-2 font-normal">Previous</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => {
            const config = IMPACT_CONFIG[event.impact];
            const Icon = config.icon;
            return (
              <tr key={event.id} className="border-b border-panel-border/50">
                <td className="py-2.5 pr-4">
                  <span className={`flex items-center gap-1.5 text-xs ${config.className}`}>
                    <Icon size={14} weight="fill" />
                    {config.label}
                  </span>
                </td>
                <td className="py-2.5 pr-4">{event.eventName}</td>
                <td className="py-2.5 pr-4 font-mono text-xs text-muted">{event.currency}</td>
                <td className="py-2.5 pr-4 text-xs text-muted">
                  {formatEventTime(event.eventTime)}
                </td>
                <td className="py-2.5 pr-4 font-mono tabular-nums">{event.actual ?? "—"}</td>
                <td className="py-2.5 pr-4 font-mono tabular-nums text-muted">
                  {event.forecast ?? "—"}
                </td>
                <td className="py-2.5 font-mono tabular-nums text-muted">
                  {event.previous ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
