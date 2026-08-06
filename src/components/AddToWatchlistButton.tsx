"use client";

import { useState, useTransition } from "react";
import { Star } from "@phosphor-icons/react";
import { addToWatchlist } from "@/app/actions/watchlist";

export function AddToWatchlistButton({ ticker }: { ticker: string }) {
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          const result = await addToWatchlist(ticker);
          if (!result?.message) setAdded(true);
        })
      }
      disabled={pending || added}
      className="flex items-center gap-1.5 rounded-full border border-panel-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent hover:text-foreground disabled:opacity-60"
    >
      <Star size={14} weight={added ? "fill" : "regular"} className={added ? "text-accent" : undefined} />
      {added ? "On watchlist" : "Add to watchlist"}
    </button>
  );
}
