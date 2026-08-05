import { Info } from "@phosphor-icons/react/dist/ssr";

export function Disclaimer() {
  return (
    <p className="flex items-start gap-2 rounded-md border border-panel-border bg-panel px-4 py-2.5 text-xs text-muted">
      <Info size={16} weight="regular" className="mt-0.5 shrink-0 text-muted" />
      <span>
        <span className="font-medium text-foreground">Not financial advice.</span>{" "}
        Data and historical patterns shown here are informational only, not a
        recommendation to buy or sell any security. Past patterns are not
        predictive of future results.
      </span>
    </p>
  );
}
