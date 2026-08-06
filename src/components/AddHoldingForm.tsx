"use client";

import { useActionState } from "react";
import { addPortfolioHolding } from "@/app/actions/portfolio";

export function AddHoldingForm() {
  const [state, action, pending] = useActionState(addPortfolioHolding, undefined);

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="text-xs text-muted" htmlFor="holding-ticker">Ticker</label>
        <input
          id="holding-ticker"
          name="ticker"
          placeholder="AAPL"
          required
          maxLength={6}
          className="mt-1 block w-24 rounded-md border border-panel-border bg-background px-2 py-1.5 text-sm uppercase outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="text-xs text-muted" htmlFor="holding-shares">Shares</label>
        <input
          id="holding-shares"
          name="shares"
          type="number"
          step="0.0001"
          min="0"
          placeholder="10"
          required
          className="mt-1 block w-24 rounded-md border border-panel-border bg-background px-2 py-1.5 text-sm outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="text-xs text-muted" htmlFor="holding-cost">Cost / share</label>
        <input
          id="holding-cost"
          name="costBasis"
          type="number"
          step="0.01"
          min="0"
          placeholder="150.00"
          required
          className="mt-1 block w-28 rounded-md border border-panel-border bg-background px-2 py-1.5 text-sm outline-none focus:border-accent"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add holding"}
      </button>
      {state?.message && <p className="w-full text-xs text-muted">{state.message}</p>}
    </form>
  );
}
