import Link from "next/link";
import { Trophy } from "@phosphor-icons/react/dist/ssr";
import type { InsiderGainer } from "@/lib/insider-trading";

const PLACES = [
  { rank: 2, order: "order-1", height: "h-24", medal: "#c7cad1", label: "2nd", delay: "150ms" },
  { rank: 1, order: "order-2", height: "h-32", medal: "#f0b429", label: "1st", delay: "0ms" },
  { rank: 3, order: "order-3", height: "h-16", medal: "#c9895a", label: "3rd", delay: "300ms" },
] as const;

function formatUsd(n: number) {
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function InsiderPodium({ gainers }: { gainers: InsiderGainer[] }) {
  const top3 = gainers.slice(0, 3);
  if (top3.length < 3) return null;

  return (
    <div>
      <div className="flex items-end justify-center gap-3 px-2 pt-2">
        {PLACES.map((place) => {
          const gainer = top3[place.rank - 1];
          if (!gainer) return null;
          return (
            <Link
              key={gainer.ownerName}
              href={`/insider-trading/${encodeURIComponent(gainer.ownerName)}`}
              className={`${place.order} group/podium flex w-1/3 flex-col items-center transition-transform duration-300 hover:-translate-y-1`}
            >
              <Trophy
                size={place.rank === 1 ? 22 : 16}
                weight="fill"
                style={{ color: place.medal }}
                className="mb-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
              />
              <p className="max-w-[9rem] truncate text-center text-sm font-semibold">{gainer.ownerName}</p>
              <p
                className={`font-mono text-xs tabular-nums ${gainer.estimatedGainUsd >= 0 ? "text-positive" : "text-negative"}`}
              >
                {gainer.estimatedGainUsd >= 0 ? "+" : ""}
                {formatUsd(gainer.estimatedGainUsd)}
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
      <p className="mt-4 text-center text-xs text-muted">
        Estimated paper gain: current market value of shares reported bought (real Form 4 prices) minus
        what they paid. Not their actual realized profit — we don&apos;t know if or when they sold. Not
        financial advice.
      </p>
    </div>
  );
}
