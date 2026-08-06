"use client";

import { Bar, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { OhlcPoint } from "@/lib/market-data";

function CandleShape(props: unknown) {
  const { x, y, width, height, payload } = props as {
    x: number;
    y: number;
    width: number;
    height: number;
    payload: OhlcPoint & { yHigh: number; yLow: number };
  };
  const isUp = payload.close >= payload.open;
  const color = isUp ? "var(--positive)" : "var(--negative)";
  const bodyTop = isUp ? y : y + height * ((payload.high - payload.close) / (payload.high - payload.low || 1));
  const bodyBottom = isUp
    ? y + height * ((payload.high - payload.open) / (payload.high - payload.low || 1))
    : y + height;
  const bodyHeight = Math.max(1, bodyBottom - bodyTop);
  const wickX = x + width / 2;

  return (
    <g>
      <line x1={wickX} x2={wickX} y1={y} y2={y + height} stroke={color} strokeWidth={1} />
      <rect x={x} y={bodyTop} width={width} height={bodyHeight} fill={color} rx={1} />
    </g>
  );
}

export function CandlestickChart({ data }: { data: OhlcPoint[] }) {
  const chartData = data.map((d) => ({ ...d, range: [d.low, d.high] as [number, number] }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="date"
          tick={{ fill: "var(--muted)", fontSize: 11 }}
          axisLine={{ stroke: "var(--panel-border)" }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis domain={["auto", "auto"]} hide />
        <Tooltip
          contentStyle={{
            background: "var(--panel)",
            border: "1px solid var(--panel-border)",
            borderRadius: 6,
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--muted)" }}
          itemStyle={{ color: "var(--foreground)" }}
          formatter={(_value, _name, item) => {
            const p = item.payload as OhlcPoint;
            return [`O ${p.open.toFixed(2)}  H ${p.high.toFixed(2)}  L ${p.low.toFixed(2)}  C ${p.close.toFixed(2)}`, ""];
          }}
        />
        <Bar dataKey="range" shape={CandleShape} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
