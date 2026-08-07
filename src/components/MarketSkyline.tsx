// Coded background scene (no image-generation tooling available this
// session) — an ascending bar skyline suggesting a bull market, rendered
// with layered gradients and a glow filter for depth. Kept to low opacity
// and masked at the edges so it reads as atmosphere behind the hero copy,
// never competing with text contrast (Operate/Persuade surfaces both
// require body text stay legible — see craft-floor.md).
//
// Two layers of motion, not a static image being panned:
//  1. Each bar's own height pulses independently (CSS scaleY,
//     transform-origin pinned to the baseline) on staggered timing, so it
//     reads like a live ticking chart rather than a picture.
//  2. The whole skyline drifts sideways forever — content is rendered
//     twice, side by side, and the wrapper scrolls left by exactly one
//     copy's width on a linear loop, so the loop point is invisible: a
//     24/7 drifting feed.
const BAR_HEIGHTS = [40, 55, 48, 70, 62, 88, 78, 105, 96, 130, 118, 155, 142, 175];

function SkylineSvg() {
  const barWidth = 1200 / BAR_HEIGHTS.length;

  return (
    <svg
      viewBox="0 0 1200 400"
      className="h-full w-full"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="barGradient" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="var(--panel-border)" />
          <stop offset="60%" stopColor="var(--accent)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
        <linearGradient id="fadeMask" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="15%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="1" />
        </linearGradient>
        <mask id="edgeFade">
          <rect width="1200" height="400" fill="url(#fadeMask)" />
        </mask>
      </defs>
      <g mask="url(#edgeFade)">
        {BAR_HEIGHTS.map((height, i) => (
          <rect
            key={i}
            className="animate-bar-pulse"
            x={i * barWidth + barWidth * 0.15}
            y={400 - height}
            width={barWidth * 0.7}
            height={height}
            rx={2}
            fill="url(#barGradient)"
            style={{
              transformOrigin: `${i * barWidth + barWidth * 0.5}px 400px`,
              animationDelay: `${(i * 0.37) % 3}s`,
              animationDuration: `${2.4 + (i % 5) * 0.3}s`,
            }}
          />
        ))}
      </g>
    </svg>
  );
}

export function MarketSkyline() {
  return (
    <div
      className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden opacity-[0.16]"
      aria-hidden="true"
    >
      <div className="animate-conveyor-left flex h-full w-[200%] flex-row">
        <div className="h-full w-1/2">
          <SkylineSvg />
        </div>
        <div className="h-full w-1/2">
          <SkylineSvg />
        </div>
      </div>
    </div>
  );
}
