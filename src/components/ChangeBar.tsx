// A magnitude bar next to a change-percent figure — the number alone
// doesn't communicate scale at a glance across a long list; a bar whose
// width tracks |change%| (capped so one outlier can't flatten the rest)
// does. Purely decorative-of-real-data, never a separate claim.
const CAP_PERCENT = 4;

export function ChangeBar({ changePercent }: { changePercent: number }) {
  const width = Math.min(100, (Math.abs(changePercent) / CAP_PERCENT) * 100);
  const positive = changePercent >= 0;
  return (
    <div className="h-1 w-14 overflow-hidden rounded-full bg-panel-border/60">
      <div
        className="h-full rounded-full"
        style={{
          width: `${width}%`,
          background: positive ? "var(--positive)" : "var(--negative)",
        }}
      />
    </div>
  );
}
