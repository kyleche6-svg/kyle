import Link from "next/link";
import { Logo } from "@/components/Logo";

type OrbitStock = { ticker: string; changePercent: number };

// The centerpiece the user asked for repeatedly, referencing alethia.earth's
// rotating 3D model with the brand mark at its center: a ring of real
// tickers orbiting the DollarWatch logo. Built with two synced CSS
// animations per chip (the ring's own rotateY, and an equal-and-opposite
// rotateY on each chip's inner wrapper) rather than JS driving transforms
// every frame — HeatmapOrbit needed requestAnimationFrame because tiles
// freeze individually on hover, but this centerpiece never needs to, so
// plain CSS keyframes are cheaper and never drop frames server-side.
export function HeroOrbit({ stocks }: { stocks: OrbitStock[] }) {
  const radius = 190;
  const angleStep = 360 / stocks.length;

  return (
    <div
      className="relative mx-auto h-[380px] w-[380px] sm:h-[440px] sm:w-[440px]"
      style={{ perspective: "1200px" }}
    >
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 132,
          height: 132,
          background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 20%, transparent) 0%, transparent 70%)",
          filter: "blur(4px)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute top-1/2 left-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-panel-border bg-panel shadow-[0_0_40px_-4px_color-mix(in_srgb,var(--accent)_50%,transparent)]"
        style={{ transformStyle: "preserve-3d" }}
      >
        <Logo size={28} />
      </div>

      <div
        className="animate-orbit-spin absolute top-1/2 left-1/2"
        style={{ transformStyle: "preserve-3d" }}
      >
        {stocks.map((stock, i) => (
          <div
            key={stock.ticker}
            className="absolute top-0 left-0"
            style={{
              transform: `rotateY(${angleStep * i}deg) translateZ(${radius}px)`,
              transformStyle: "preserve-3d",
            }}
          >
            <div
              className="animate-orbit-spin-reverse -translate-x-1/2 -translate-y-1/2"
              style={{ transformStyle: "preserve-3d" }}
            >
              <Link
                href={`/stocks/${stock.ticker}`}
                prefetch={false}
                className="flex w-[76px] flex-col items-center gap-0.5 rounded-md border border-panel-border bg-panel/90 px-2.5 py-2 text-center shadow-[0_6px_20px_-6px_rgba(0,0,0,0.7)] backdrop-blur-sm transition-transform hover:scale-110"
              >
                <p className="font-mono text-xs font-semibold">{stock.ticker}</p>
                <p
                  className={`font-mono text-[10px] tabular-nums ${stock.changePercent >= 0 ? "text-positive" : "text-negative"}`}
                >
                  {stock.changePercent >= 0 ? "+" : ""}
                  {stock.changePercent.toFixed(2)}%
                </p>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
