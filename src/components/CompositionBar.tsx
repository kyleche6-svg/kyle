const SEGMENT_COLORS = ["var(--accent)", "var(--accent-2)", "var(--accent-warm)", "#5eead4", "#f472b6"];

// Single stacked bar showing a portfolio's top-holding weights at a
// glance — same idiom as a disk-usage or budget-allocation bar. Segment
// widths are the real disclosed 13F weights; "Other" is whatever's left,
// never invented.
export function CompositionBar({ weights }: { weights: number[] }) {
  const accounted = weights.reduce((sum, w) => sum + w, 0);
  const other = Math.max(0, 1 - accounted);

  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-panel-border/40">
      {weights.map((w, i) => (
        <div key={i} style={{ width: `${w * 100}%`, background: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }} />
      ))}
      {other > 0.001 && <div style={{ width: `${other * 100}%` }} className="bg-panel-border" />}
    </div>
  );
}
