"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import type { SeriesPoint } from "@/lib/market-data";

export function PriceChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <YAxis domain={["auto", "auto"]} hide />
        <Tooltip
          contentStyle={{
            background: "var(--panel)",
            border: "1px solid var(--panel-border)",
            borderRadius: 6,
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--muted)" }}
          formatter={(value) => (typeof value === "number" ? value.toFixed(3) : value)}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--accent)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
