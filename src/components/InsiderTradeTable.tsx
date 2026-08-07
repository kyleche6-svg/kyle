"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { TrendUp, TrendDown, Minus } from "@phosphor-icons/react/dist/ssr";
import type { InsiderTrade } from "@/lib/insider-trading";

function formatUsd(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function InsiderTradeTable({
  initialTrades,
  total,
  owner,
  search,
}: {
  initialTrades: InsiderTrade[];
  total: number;
  owner?: string;
  search?: string;
}) {
  const [trades, setTrades] = useState(initialTrades);
  const [isPending, startTransition] = useTransition();
  const hasMore = trades.length < total;

  function loadMore() {
    startTransition(async () => {
      const params = new URLSearchParams({ offset: String(trades.length) });
      if (owner) params.set("owner", owner);
      if (search) params.set("search", search);

      const res = await fetch(`/api/insider-trading?${params.toString()}`);
      if (!res.ok) return;
      const data: { trades: InsiderTrade[] } = await res.json();
      setTrades((prev) => [...prev, ...data.trades]);
    });
  }

  if (trades.length === 0) {
    return <p className="text-sm text-muted">No filings match.</p>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-panel-border text-xs text-muted">
              <th className="pb-2 pr-4 font-normal">Ticker</th>
              <th className="pb-2 pr-4 font-normal">Insider</th>
              <th className="pb-2 pr-4 font-normal">Relationship</th>
              <th className="pb-2 pr-4 font-normal">Transaction</th>
              <th className="pb-2 pr-4 font-normal">Shares</th>
              <th className="pb-2 pr-4 font-normal">Price</th>
              <th className="pb-2 font-normal">Filed</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr key={trade.id} className="border-b border-panel-border/50">
                <td className="py-2 pr-4 font-mono font-medium">
                  <Link href={`/stocks/${trade.ticker}`} className="hover:text-accent">
                    {trade.ticker}
                  </Link>
                </td>
                <td className="py-2 pr-4">
                  <Link
                    href={`/insider-trading/${encodeURIComponent(trade.ownerName)}`}
                    className="hover:text-accent"
                  >
                    {trade.ownerName}
                  </Link>
                </td>
                <td className="py-2 pr-4 text-xs text-muted">{trade.relationship}</td>
                <td className="py-2 pr-4">
                  <span
                    className={`flex items-center gap-1 text-xs ${
                      trade.direction === "buy"
                        ? "text-positive"
                        : trade.direction === "sell"
                          ? "text-negative"
                          : "text-muted"
                    }`}
                  >
                    {trade.direction === "buy" ? (
                      <TrendUp size={12} weight="bold" />
                    ) : trade.direction === "sell" ? (
                      <TrendDown size={12} weight="bold" />
                    ) : (
                      <Minus size={12} weight="bold" />
                    )}
                    {trade.transactionCode}
                  </span>
                </td>
                <td className="py-2 pr-4 font-mono text-xs tabular-nums">{trade.shares.toLocaleString()}</td>
                <td className="py-2 pr-4 font-mono text-xs tabular-nums text-muted">
                  {trade.pricePerShare ? formatUsd(trade.pricePerShare) : "—"}
                </td>
                <td className="py-2 text-xs text-muted">{trade.filedDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={loadMore}
            disabled={isPending}
            className="rounded-md border border-panel-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
          >
            {isPending ? "Loading…" : `Load more (${trades.length} of ${total})`}
          </button>
        </div>
      )}
    </div>
  );
}
