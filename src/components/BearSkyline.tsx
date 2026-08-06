// Mirror of MarketSkyline for bearish contexts: a descending, crashing bar
// line in red instead of the ascending gold bull skyline. Same technique —
// coded SVG, low opacity, edge-masked so it stays atmosphere behind content.
const BAR_HEIGHTS = [175, 142, 155, 118, 130, 96, 105, 78, 88, 62, 70, 48, 55, 40];

export function BearSkyline() {
  const barWidth = 1200 / BAR_HEIGHTS.length;

  return (
    <svg
      viewBox="0 0 1200 400"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.14]"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="bearBarGradient" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="var(--panel-border)" />
          <stop offset="60%" stopColor="var(--negative)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--negative)" />
        </linearGradient>
        <linearGradient id="bearFadeMask" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="15%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="1" />
        </linearGradient>
        <mask id="bearEdgeFade">
          <rect width="1200" height="400" fill="url(#bearFadeMask)" />
        </mask>
      </defs>
      <g mask="url(#bearEdgeFade)">
        {BAR_HEIGHTS.map((height, i) => (
          <rect
            key={i}
            x={i * barWidth + barWidth * 0.15}
            y={400 - height}
            width={barWidth * 0.7}
            height={height}
            rx={2}
            fill="url(#bearBarGradient)"
          />
        ))}
        <path
          d={`M0,${400 - BAR_HEIGHTS[0]} ${BAR_HEIGHTS.map((h, i) => `L${i * barWidth + barWidth / 2},${400 - h}`).join(" ")}`}
          stroke="var(--negative)"
          strokeWidth="1.5"
          fill="none"
          opacity="0.6"
        />
      </g>
    </svg>
  );
}
