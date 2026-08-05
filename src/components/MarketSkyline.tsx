// Coded background scene (no image-generation tooling available this
// session) — an ascending bar skyline suggesting a bull market, rendered
// with layered gradients and a glow filter for depth. Kept to low opacity
// and masked at the edges so it reads as atmosphere behind the hero copy,
// never competing with text contrast (Operate/Persuade surfaces both
// require body text stay legible — see craft-floor.md).
const BAR_HEIGHTS = [40, 55, 48, 70, 62, 88, 78, 105, 96, 130, 118, 155, 142, 175];

export function MarketSkyline() {
  const barWidth = 1200 / BAR_HEIGHTS.length;

  return (
    <svg
      viewBox="0 0 1200 400"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.16]"
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
            x={i * barWidth + barWidth * 0.15}
            y={400 - height}
            width={barWidth * 0.7}
            height={height}
            rx={2}
            fill="url(#barGradient)"
          />
        ))}
        <path
          d={`M0,${400 - BAR_HEIGHTS[0]} ${BAR_HEIGHTS.map((h, i) => `L${i * barWidth + barWidth / 2},${400 - h}`).join(" ")}`}
          stroke="var(--accent)"
          strokeWidth="1.5"
          fill="none"
          opacity="0.6"
        />
      </g>
    </svg>
  );
}
