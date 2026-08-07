"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Bar,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OhlcPoint, ChartTimeframe } from "@/lib/market-data";
import { CHART_TIMEFRAMES } from "@/lib/market-data";

// TradingView-style chart: timeframe switcher, candles/line toggle, and a
// handful of purely descriptive overlays (moving averages, volume) — no
// buy/sell markers, no "signal" of any kind, same constraint as the rest
// of the app.

function CandleShape(props: unknown) {
  const { x, y, width, height, payload } = props as {
    x: number;
    y: number;
    width: number;
    height: number;
    payload: OhlcPoint;
  };
  const isUp = payload.close >= payload.open;
  const color = isUp ? "var(--positive)" : "var(--negative)";
  const range = payload.high - payload.low || 1;
  const bodyTop = isUp ? y : y + height * ((payload.high - payload.close) / range);
  const bodyBottom = isUp ? y + height * ((payload.high - payload.open) / range) : y + height;
  const bodyHeight = Math.max(1, bodyBottom - bodyTop);
  const wickX = x + width / 2;

  return (
    <g>
      <line x1={wickX} x2={wickX} y1={y} y2={y + height} stroke={color} strokeWidth={1} />
      <rect x={x} y={bodyTop} width={width} height={bodyHeight} fill={color} rx={1} />
    </g>
  );
}

function sma(closes: number[], period: number): (number | null)[] {
  return closes.map((_, i) => {
    if (i < period - 1) return null;
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += closes[j];
    return sum / period;
  });
}

function formatVolume(v: number) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return String(v);
}

export function StockChart({ ticker, initialOhlc }: { ticker: string; initialOhlc: OhlcPoint[] }) {
  const [timeframe, setTimeframe] = useState<ChartTimeframe>("3M");
  const [chartType, setChartType] = useState<"candles" | "line">("candles");
  const [showSma20, setShowSma20] = useState(false);
  const [showSma50, setShowSma50] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [ohlc, setOhlc] = useState<OhlcPoint[]>(initialOhlc);
  const [isPending, startTransition] = useTransition();

  function selectTimeframe(next: ChartTimeframe) {
    if (next === timeframe) return;
    setTimeframe(next);
    startTransition(async () => {
      const res = await fetch(`/api/stocks/${ticker}/chart?timeframe=${next}`);
      if (!res.ok) return;
      const data = await res.json();
      setOhlc(data.ohlc);
    });
  }

  const chartData = useMemo(() => {
    const closes = ohlc.map((d) => d.close);
    const sma20 = sma(closes, 20);
    const sma50 = sma(closes, 50);
    return ohlc.map((d, i) => ({
      ...d,
      range: [d.low, d.high] as [number, number],
      sma20: sma20[i],
      sma50: sma50[i],
    }));
  }, [ohlc]);

  const hasVolume = ohlc.some((d) => d.volume !== null);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {CHART_TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => selectTimeframe(tf)}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                timeframe === tf
                  ? "border-accent text-accent"
                  : "border-panel-border text-muted hover:text-foreground"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {(["candles", "line"] as const).map((option) => (
            <button
              key={option}
              onClick={() => setChartType(option)}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                chartType === option
                  ? "border-accent text-accent"
                  : "border-panel-border text-muted hover:text-foreground"
              }`}
            >
              {option}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-panel-border" />
          <button
            onClick={() => setShowSma20((v) => !v)}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              showSma20 ? "border-accent text-accent" : "border-panel-border text-muted hover:text-foreground"
            }`}
          >
            SMA 20
          </button>
          <button
            onClick={() => setShowSma50((v) => !v)}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              showSma50 ? "border-accent text-accent" : "border-panel-border text-muted hover:text-foreground"
            }`}
          >
            SMA 50
          </button>
          {hasVolume && (
            <button
              onClick={() => setShowVolume((v) => !v)}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                showVolume ? "border-accent text-accent" : "border-panel-border text-muted hover:text-foreground"
              }`}
            >
              Volume
            </button>
          )}
        </div>
      </div>

      <div className={isPending ? "opacity-50 transition-opacity" : "transition-opacity"}>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="date"
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              axisLine={{ stroke: "var(--panel-border)" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis yAxisId="price" domain={["auto", "auto"]} hide />
            {showVolume && hasVolume && (
              // Volume bars sit on their own axis scaled to a small fraction
              // of the pane height, so they read as a strip along the
              // bottom rather than dominating the price chart above them —
              // the standard TradingView layout.
              <YAxis yAxisId="volume" domain={[0, (dataMax: number) => dataMax * 5]} hide />
            )}
            <Tooltip
              contentStyle={{
                background: "var(--panel)",
                border: "1px solid var(--panel-border)",
                borderRadius: 6,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--muted)" }}
              itemStyle={{ color: "var(--foreground)" }}
              formatter={(value, name, item) => {
                if (name === "volume") return [formatVolume(value as number), "Volume"];
                if (name === "sma20") return [`$${(value as number).toFixed(2)}`, "SMA 20"];
                if (name === "sma50") return [`$${(value as number).toFixed(2)}`, "SMA 50"];
                const p = item.payload as OhlcPoint;
                return [`O ${p.open.toFixed(2)}  H ${p.high.toFixed(2)}  L ${p.low.toFixed(2)}  C ${p.close.toFixed(2)}`, "Price"];
              }}
            />
            {showVolume && hasVolume && (
              <Bar yAxisId="volume" dataKey="volume" fill="var(--muted)" opacity={0.25} isAnimationActive={false} />
            )}
            {chartType === "candles" ? (
              <Bar yAxisId="price" dataKey="range" shape={CandleShape} isAnimationActive={false} />
            ) : (
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="close"
                stroke="var(--accent)"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            )}
            {showSma20 && (
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="sma20"
                stroke="#eab308"
                strokeWidth={1.25}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            )}
            {showSma50 && (
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="sma50"
                stroke="#a855f7"
                strokeWidth={1.25}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
