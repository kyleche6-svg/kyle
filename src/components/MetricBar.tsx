// Small fill bar under a percentage stat tile (margins, ROE) — the
// number alone reads the same whether it's 4% or 40%; a bar scaled to a
// realistic cap makes the magnitude legible at a glance.
export function MetricBar({ percent, cap = 50 }: { percent: number | null; cap?: number }) {
  if (percent === null) return null;
  const width = Math.max(0, Math.min(100, (Math.abs(percent) / cap) * 100));
  return (
    <div className="mt-1.5 h-1 w-full max-w-16 overflow-hidden rounded-full bg-panel-border/60">
      <div
        className="h-full rounded-full"
        style={{ width: `${width}%`, background: percent >= 0 ? "var(--accent)" : "var(--negative)" }}
      />
    </div>
  );
}
