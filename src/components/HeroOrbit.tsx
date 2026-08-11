"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

type OrbitStock = { ticker: string; changePercent: number };

// The centerpiece referencing alethia.earth's rotating 3D model, with the
// brand mark at its center and real tickers orbiting it like a planet.
//
// Two rewrites led here. First was a true CSS rotateY/translateZ orbit
// with a counter-rotation on each chip meant to keep it billboarded
// toward the camera — confirmed live the counter-rotation didn't fully
// cancel at every angle, so chip text visibly mirrored on the far side.
// Second was a flat single-ring ellipse, which fixed the mirroring but
// read as a ring, not a sphere.
//
// This version distributes chips evenly across an actual sphere (a
// Fibonacci lattice — the standard way to place N points roughly
// equidistant on a sphere surface) and rotates that sphere around the
// Y axis every frame. Critically, only each chip's *position* (x, y,
// derived from its 3D point) and *depth* (scale/opacity/z-index, from
// how far toward or away from the camera that point currently is) are
// ever written to style — never a rotation of the chip's own face — so
// backwards text stays structurally impossible while the motion reads
// as a genuine rotating globe.
export function HeroOrbit({ stocks }: { stocks: OrbitStock[] }) {
  const sphereRadius = 175;
  const squashY = 0.92; // slight vertical squash so it reads as a sphere, not a flat disc, in the box's aspect ratio
  const tiltRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rotationRef = useRef(0);

  // Fibonacci sphere: each point's own (x, y, z) on a unit sphere,
  // computed once per stock list, then rotated live in the animation loop.
  const points = useMemo(() => {
    const n = stocks.length;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    return stocks.map((_, i) => {
      const y = 1 - (i / Math.max(1, n - 1)) * 2;
      const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = goldenAngle * i;
      return { x: Math.cos(theta) * radiusAtY, y, z: Math.sin(theta) * radiusAtY };
    });
  }, [stocks]);

  useEffect(() => {
    let raf: number;
    let last = performance.now();
    const DEGREES_PER_MS = 360 / 28000; // one full rotation every 28s

    function tick(now: number) {
      const dt = now - last;
      last = now;
      rotationRef.current = (rotationRef.current + dt * DEGREES_PER_MS) % 360;
      const phi = (rotationRef.current * Math.PI) / 180;
      const cosPhi = Math.cos(phi);
      const sinPhi = Math.sin(phi);

      points.forEach((p, i) => {
        // Rotate the point around the Y axis.
        const rx = p.x * cosPhi + p.z * sinPhi;
        const rz = -p.x * sinPhi + p.z * cosPhi;

        const screenX = rx * sphereRadius;
        const screenY = p.y * sphereRadius * squashY;
        // depth: 0 at the back of the sphere, 1 at the front.
        const depth = (rz + 1) / 2;
        const scale = 0.42 + depth * 0.62;

        const el = chipRefs.current[i];
        if (el) {
          el.style.transform = `translate(${screenX}px, ${screenY}px) scale(${scale})`;
          el.style.opacity = `${0.4 + depth * 0.6}`;
          el.style.zIndex = `${Math.round(depth * 100)}`;
        }
      });

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [points]);

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
        el.style.transform = `rotateX(${py * -10}deg) rotateY(${px * 10}deg)`;
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
        <div className="absolute top-1/2 left-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-panel-border bg-panel shadow-[0_0_40px_-4px_color-mix(in_srgb,var(--accent)_50%,transparent)]">
          <Logo size={28} />
        </div>

        <div className="absolute top-1/2 left-1/2">
          {stocks.map((stock, i) => (
            <div
              key={stock.ticker}
              ref={(el) => {
                chipRefs.current[i] = el;
              }}
              className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2"
            >
              <Link
                href={`/stocks/${stock.ticker}`}
                prefetch={false}
                className="flex w-[72px] flex-col items-center gap-0.5 rounded-md border border-panel-border bg-panel/90 px-2 py-1.5 text-center shadow-[0_6px_20px_-6px_rgba(0,0,0,0.7)] backdrop-blur-sm transition-transform hover:scale-110"
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
          ))}
        </div>
      </div>
    </div>
  );
}
