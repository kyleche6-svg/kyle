import Link from "next/link";
import { Trophy, TrendUp } from "@phosphor-icons/react/dist/ssr";

export type PodiumStock = { ticker: string; changePercent: number };

const PLACES = [
  { rank: 2, order: "order-1", height: "h-24", medal: "#c7cad1", label: "2nd", delay: "150ms" },
  { rank: 1, order: "order-2", height: "h-32", medal: "#f0b429", label: "1st", delay: "0ms" },
  { rank: 3, order: "order-3", height: "h-16", medal: "#c9895a", label: "3rd", delay: "300ms" },
] as const;

function formatDelta(changePercent: number) {
  const sign = changePercent >= 0 ? "+" : "";
  return `${sign}${changePercent.toFixed(2)}%`;
}

export function GainersPodium({ stocks }: { stocks: PodiumStock[] }) {
  const top3 = stocks.slice(0, 3);
  if (top3.length < 3) return null;

  return (
    <div className="flex items-end justify-center gap-3 px-2 pt-2">
      {PLACES.map((place) => {
        const stock = top3[place.rank - 1];
        if (!stock) return null;
        return (
          <Link
            key={stock.ticker}
            href={`/stocks/${stock.ticker}`}
            className={`${place.order} group/podium flex w-1/3 flex-col items-center transition-transform duration-300 hover:-translate-y-1`}
          >
            <Trophy
              size={place.rank === 1 ? 22 : 16}
              weight="fill"
              style={{ color: place.medal }}
              className="mb-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
            />
            <p className="font-mono text-sm font-semibold">{stock.ticker}</p>
            <p className="flex items-center gap-0.5 font-mono text-xs tabular-nums text-positive">
              <TrendUp size={10} weight="bold" />
              {formatDelta(stock.changePercent)}
            </p>
            <div
              className={`animate-podium-rise mt-2 flex w-full ${place.height} items-start justify-center rounded-t-md border border-b-0 border-panel-border pt-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-[filter] duration-300 group-hover/podium:brightness-110`}
              style={{
                background: `linear-gradient(180deg, color-mix(in srgb, ${place.medal} 22%, var(--panel)) 0%, var(--panel) 100%)`,
                animationDelay: place.delay,
              }}
            >
              <span className="text-xs font-semibold text-muted">{place.label}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
