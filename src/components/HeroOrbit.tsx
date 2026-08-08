"use client";

import { useRef } from "react";
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
// plain CSS keyframes are cheaper and never drop frames.
//
// On top of the auto-spin, the whole rig tilts toward the cursor
// (rotateX/rotateY written straight to the element on mousemove, not
// React state — this needs to update every frame without a re-render)
// for a parallax "the model reacts to you" feel, and eases back to flat
// on mouse-leave via a CSS transition that only applies when not actively
// tracking the pointer.
export function HeroOrbit({ stocks }: { stocks: OrbitStock[] }) {
  const radius = 190;
  const angleStep = 360 / stocks.length;
  const tiltRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="relative mx-auto h-[380px] w-[380px] sm:h-[440px] sm:w-[440px]"
      style={{ perspective: "1200px" }}
      onMouseMove={(e) => {
        const el = tiltRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        el.style.transition = "transform 0.1s ease-out";
        el.style.transform = `rotateX(${py * -16}deg) rotateY(${px * 16}deg)`;
      }}
      onMouseLeave={() => {
        const el = tiltRef.current;
        if (!el) return;
        el.style.transition = "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)";
        el.style.transform = "rotateX(0deg) rotateY(0deg)";
      }}
    >
      <div ref={tiltRef} className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: 132,
            height: 132,
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--accent) 20%, transparent) 0%, transparent 70%)",
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
    </div>
  );
}
