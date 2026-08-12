type TapeStock = { ticker: string; changePercent: number; price: number };

// Full-width, always-moving ticker ribbon — real quotes, not decoration.
// Same double-render/50%-scroll trick as MarketSkyline so the loop point
// is invisible, but this one is legible foreground content (not
// background atmosphere), so it pauses on hover for anyone trying to
// actually read a value.
function TapeContent({ stocks }: { stocks: TapeStock[] }) {
  return (
    <>
      {stocks.map((s, i) => (
        <div key={`${s.ticker}-${i}`} className="flex shrink-0 items-center gap-2 px-5 font-mono text-xs">
          <span className="font-semibold text-foreground">{s.ticker}</span>
          <span className="tabular-nums text-muted">${s.price.toFixed(2)}</span>
          <span className={`tabular-nums ${s.changePercent >= 0 ? "text-positive" : "text-negative"}`}>
            {s.changePercent >= 0 ? "+" : ""}
            {s.changePercent.toFixed(2)}%
          </span>
        </div>
      ))}
    </>
  );
}

export function TickerTape({ stocks, isLive }: { stocks: TapeStock[]; isLive: boolean }) {
  return (
    <div className="group relative flex overflow-hidden border-y border-panel-border bg-panel/60">
      <div className="flex shrink-0 items-center border-r border-panel-border bg-background/80 px-4 py-2.5">
        <span className="relative flex h-1.5 w-1.5">
          {isLive && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-75" />
          )}
          <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${isLive ? "bg-positive" : "bg-muted"}`} />
        </span>
        <span className="ml-2 shrink-0 font-mono text-[10px] font-semibold tracking-[0.15em] text-muted uppercase">
          {isLive ? "Live" : "Delayed"}
        </span>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-panel to-transparent" />
        <div className="animate-conveyor-left group-hover:[animation-play-state:paused] flex w-max py-2.5">
          <TapeContent stocks={stocks} />
          <TapeContent stocks={stocks} />
        </div>
      </div>
    </div>
  );
}
