"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TrendPoint } from "@/lib/politician-performance";

export function PerformanceTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
          formatter={(value, name) => [
            `${(value as number).toFixed(1)}`,
            name === "portfolioIndex" ? "Disclosed buys" : "S&P 500",
          ]}
        />
        <Line type="monotone" dataKey="portfolioIndex" stroke="var(--accent)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="spyIndex" stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
