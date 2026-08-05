"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SeriesPoint } from "@/lib/market-data";

export function StockPriceBarChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
          formatter={(value) => (typeof value === "number" ? `$${value.toFixed(2)}` : value)}
        />
        <Bar dataKey="value" fill="var(--accent)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
