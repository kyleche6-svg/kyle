"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { HistogramBucket } from "@/lib/historical-stats";

export function ReturnHistogram({ data }: { data: HistogramBucket[] }) {
  return (
    <ResponsiveContainer width="100%" height={90}>
      <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <XAxis dataKey="rangeMid" hide />
        <Tooltip
          contentStyle={{
            background: "var(--panel)",
            border: "1px solid var(--panel-border)",
            borderRadius: 6,
            fontSize: 11,
          }}
          labelFormatter={() => ""}
          itemStyle={{ color: "var(--foreground)" }}
          formatter={(value, _name, item) => [
            `${((value as number) * 100).toFixed(0)}% of periods`,
            item.payload.rangeLabel,
          ]}
        />
        <Bar dataKey="frequency" radius={[2, 2, 0, 0]}>
          {data.map((bucket, i) => (
            <Cell key={i} fill={bucket.rangeMid >= 0 ? "var(--positive)" : "var(--negative)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
