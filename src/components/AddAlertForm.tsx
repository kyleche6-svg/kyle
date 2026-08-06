"use client";

import { useActionState } from "react";
import { createPriceAlert } from "@/app/actions/alerts";

export function AddAlertForm() {
  const [state, action, pending] = useActionState(createPriceAlert, undefined);

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="text-xs text-muted" htmlFor="alert-ticker">Ticker</label>
        <input
          id="alert-ticker"
          name="ticker"
          placeholder="AAPL"
          required
          maxLength={6}
          className="mt-1 block w-24 rounded-md border border-panel-border bg-background px-2 py-1.5 text-sm uppercase outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="text-xs text-muted" htmlFor="alert-direction">Direction</label>
        <select
          id="alert-direction"
          name="direction"
          className="mt-1 block rounded-md border border-panel-border bg-background px-2 py-1.5 text-sm outline-none focus:border-accent"
        >
          <option value="above">Goes above</option>
          <option value="below">Goes below</option>
        </select>
      </div>
      <div>
        <label className="text-xs text-muted" htmlFor="alert-price">Price</label>
        <input
          id="alert-price"
          name="targetPrice"
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
        {pending ? "Adding…" : "Add alert"}
      </button>
      {state?.message && <p className="w-full text-xs text-muted">{state.message}</p>}
    </form>
  );
}
