"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";

type OrbitStock = { ticker: string; changePercent: number };

function heatColor(changePercent: number): string {
  const clamped = Math.max(-3, Math.min(3, changePercent));
  const intensity = Math.abs(clamped) / 3;
  const color = clamped >= 0 ? "16,230,110" : "255,55,55";
  return `rgba(${color}, ${0.35 + intensity * 0.55})`;
}

const DEGREES_PER_MS = 360 / 32000; // one full rotation every 32s
const CATCH_UP_MS = 500;

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

// Shortest signed distance from `from` to `to` in degrees, wrapping at
// 360 — without this, catching up after a long hover could spin the
// tile the "long way" around instead of easing back the short way.
function shortestDelta(from: number, to: number) {
  return (((to - from) % 360) + 540) % 360 - 180;
}

type CatchUp = { from: number; startedAt: number } | null;

// Driven entirely by requestAnimationFrame writing directly to each
// tile's style.transform — deliberately not a CSS @keyframes animation.
// A CSS-animated parent ring plus a separate `translate` property per
// tile for an idle bob was the first version, and mixing those two
// transform sources in 3D space produced visible popping ("teleporting").
// A single transform write per tile per frame avoids that entirely, and
// it's also the only way to freeze one tile's own rotation on hover
// while the rest of the ring keeps moving — CSS animation-play-state can
// only pause/resume, not single out one element sharing its siblings'
// driving clock. On hover-out, the tile eases back to where it "should"
// be (its synced ring position) rather than resuming forward from
// wherever it happened to stop, so it always rejoins the ring cleanly.
export function HeatmapOrbit({ stocks }: { stocks: OrbitStock[] }) {
  const radius = Math.max(260, stocks.length * 16);
  const tileRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const anglesRef = useRef<number[]>([]);
  const catchUpRef = useRef<CatchUp[]>([]);
  const hoveredRef = useRef<number | null>(null);
  const globalAngleRef = useRef(0);

  const baseAngles = useMemo(() => stocks.map((_, i) => (360 / stocks.length) * i), [stocks]);
  const scales = useMemo(
    () => stocks.map((s) => 0.7 + (Math.min(3, Math.abs(s.changePercent)) / 3) * 0.9),
    [stocks],
  );

  useEffect(() => {
    anglesRef.current = baseAngles.slice();
    catchUpRef.current = stocks.map(() => null);
    let raf: number;
    let last = performance.now();

    function tick(now: number) {
      const dt = now - last;
      last = now;
      globalAngleRef.current += dt * DEGREES_PER_MS;

      baseAngles.forEach((base, i) => {
        const synced = base + globalAngleRef.current;

        if (hoveredRef.current === i) {
          // frozen — leave anglesRef.current[i] untouched
        } else {
          const catchUp = catchUpRef.current[i];
          if (catchUp) {
            const elapsed = now - catchUp.startedAt;
            if (elapsed >= CATCH_UP_MS) {
              anglesRef.current[i] = synced;
              catchUpRef.current[i] = null;
            } else {
              const t = easeOutCubic(elapsed / CATCH_UP_MS);
              anglesRef.current[i] = catchUp.from + shortestDelta(catchUp.from, synced) * t;
            }
          } else {
            anglesRef.current[i] = synced;
          }
        }

        const el = tileRefs.current[i];
        if (el) {
          el.style.transform = `rotateY(${anglesRef.current[i]}deg) translateZ(${radius}px) scale(${scales[i]})`;
        }
      });

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stocks, baseAngles, radius, scales]);

  return (
    <div className="relative h-[340px] w-full" style={{ perspective: "1400px" }}>
      <div className="absolute top-1/2 left-1/2" style={{ transformStyle: "preserve-3d" }}>
        {stocks.map((stock, i) => (
          <Link
            key={stock.ticker}
            ref={(el) => {
              tileRefs.current[i] = el;
            }}
            href={`/stocks/${stock.ticker}`}
            onMouseEnter={() => {
              hoveredRef.current = i;
            }}
            onMouseLeave={() => {
              if (hoveredRef.current === i) {
                hoveredRef.current = null;
                catchUpRef.current[i] = { from: anglesRef.current[i], startedAt: performance.now() };
              }
            }}
            className="absolute flex w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 rounded-md border border-panel-border p-2 text-center shadow-[0_4px_16px_-4px_rgba(0,0,0,0.5)] backdrop-blur-sm transition-shadow hover:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.6)]"
            style={{
              backgroundColor: heatColor(stock.changePercent),
              backfaceVisibility: "hidden",
            }}
          >
            <p className="font-mono text-xs font-semibold">{stock.ticker}</p>
            <p className="font-mono text-[10px] tabular-nums">
              {stock.changePercent >= 0 ? "+" : ""}
              {stock.changePercent.toFixed(2)}%
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
