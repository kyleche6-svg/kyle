"use client";

import { useState } from "react";
import type { SeriesPoint, OhlcPoint } from "@/lib/market-data";
import { StockPriceBarChart } from "@/components/StockPriceBarChart";
import { CandlestickChart } from "@/components/CandlestickChart";

export function PriceChartToggle({ series, ohlc }: { series: SeriesPoint[]; ohlc: OhlcPoint[] }) {
  const [mode, setMode] = useState<"bars" | "candles">("candles");

  return (
    <div>
      <div className="mb-2 flex items-center justify-end gap-1">
        {(["candles", "bars"] as const).map((option) => (
          <button
            key={option}
            onClick={() => setMode(option)}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
              mode === option
                ? "border-accent text-accent"
                : "border-panel-border text-muted hover:text-foreground"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      {mode === "candles" ? <CandlestickChart data={ohlc} /> : <StockPriceBarChart data={series} />}
    </div>
  );
}
