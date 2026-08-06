"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = [
  "var(--accent)",
  "#22c55e",
  "#3b82f6",
  "#ef4444",
  "#a855f7",
  "#f97316",
  "#14b8a6",
  "#eab308",
];

export type HoldingSlice = { ticker: string; value: number };

function renderTickerLabel(props: unknown) {
  const { cx, cy, midAngle, outerRadius, ticker } = props as {
    cx: number;
    cy: number;
    midAngle: number;
    outerRadius: number;
    ticker: string;
  };
  const RAD = Math.PI / 180;
  const x = cx + (outerRadius + 16) * Math.cos(-midAngle * RAD);
  const y = cy + (outerRadius + 16) * Math.sin(-midAngle * RAD);

  return (
    <text
      x={x}
      y={y}
      fill="var(--foreground)"
      fontSize={11}
      fontFamily="var(--font-mono)"
      fontWeight={600}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
    >
      {ticker}
    </text>
  );
}

export function HoldingsPie({ data }: { data: HoldingSlice[] }) {
  return (
    <div
      className="relative"
      style={{ perspective: "900px" }}
    >
      <div
        className="drop-shadow-[0_18px_28px_rgba(0,0,0,0.55)]"
        style={{ transform: "rotateX(38deg) rotateZ(-6deg)", transformStyle: "preserve-3d" }}
      >
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data.map((d) => ({ ...d, ticker: d.ticker }))}
              dataKey="value"
              nameKey="ticker"
              innerRadius={48}
              outerRadius={82}
              paddingAngle={3}
              isAnimationActive
              label={renderTickerLabel}
              labelLine={{ stroke: "var(--panel-border)", strokeWidth: 1 }}
            >
              {data.map((entry, i) => (
                <Cell
                  key={entry.ticker}
                  fill={COLORS[i % COLORS.length]}
                  stroke="var(--panel)"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--panel)",
                border: "1px solid var(--panel-border)",
                borderRadius: 6,
                fontSize: 12,
              }}
              itemStyle={{ color: "var(--foreground)" }}
              labelStyle={{ color: "var(--foreground)" }}
              formatter={(value, name) => [`$${Math.round(Number(value)).toLocaleString()}`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
