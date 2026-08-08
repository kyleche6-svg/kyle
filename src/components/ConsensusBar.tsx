// Segmented horizontal bar for a Buy/Hold/Sell analyst split — replaces
// a "3 / 5 / 1" text ratio with a shape the eye reads instantly, same
// segmented-bar idiom as a vote or storage breakdown. Widths are exact
// proportions of the real counts, not stylized.
export function ConsensusBar({
  buyCount,
  holdCount,
  sellCount,
}: {
  buyCount: number;
  holdCount: number;
  sellCount: number;
}) {
  const total = buyCount + holdCount + sellCount;
  if (total === 0) return <div className="h-1.5 w-20 rounded-full bg-panel-border/60" />;

  return (
    <div className="flex h-1.5 w-20 overflow-hidden rounded-full">
      <div style={{ width: `${(buyCount / total) * 100}%`, background: "var(--positive)" }} />
      <div style={{ width: `${(holdCount / total) * 100}%`, background: "var(--muted)" }} />
      <div style={{ width: `${(sellCount / total) * 100}%`, background: "var(--negative)" }} />
    </div>
  );
}
