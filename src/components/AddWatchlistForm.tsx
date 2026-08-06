"use client";

import { useRef, useState, useTransition } from "react";
import { addToWatchlist } from "@/app/actions/watchlist";

export function AddWatchlistForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) =>
        startTransition(async () => {
          const ticker = String(formData.get("ticker") ?? "");
          const result = await addToWatchlist(ticker);
          if (result?.message) setError(result.message);
          else {
            setError(null);
            formRef.current?.reset();
          }
        })
      }
      className="flex items-end gap-2"
    >
      <div>
        <label className="text-xs text-muted" htmlFor="watchlist-ticker">Add ticker</label>
        <input
          id="watchlist-ticker"
          name="ticker"
          placeholder="AAPL"
          required
          maxLength={6}
          className="mt-1 block w-28 rounded-md border border-panel-border bg-background px-2 py-1.5 text-sm uppercase outline-none focus:border-accent"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add"}
      </button>
      {error && <p className="text-xs text-negative">{error}</p>}
    </form>
  );
}
