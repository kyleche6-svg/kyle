import { createCheckoutSession } from "@/app/actions/billing";
import { Panel } from "@/components/Panel";

const features = [
  "USD strength dashboard with live currency & commodity views",
  "Congressional trading disclosures, updated as filings land",
  "Market-moving post tracker with historical price-reaction windows",
  "Full access to all future dashboard features",
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Pricing</h1>
        <p className="mt-3 text-muted">
          One plan. Everything included. Cancel anytime.
        </p>
      </div>

      <Panel className="mx-auto mt-12 max-w-md">
        <div className="text-center">
          <p className="text-sm text-muted">DollarWatch Pro</p>
          <p className="mt-2 text-4xl font-semibold">
            $19<span className="text-lg text-muted">/month</span>
          </p>
        </div>
        <ul className="mt-8 flex flex-col gap-3 text-sm">
          {features.map((feature) => (
            <li key={feature} className="flex gap-2">
              <span className="text-accent">&#10003;</span>
              <span className="text-foreground/90">{feature}</span>
            </li>
          ))}
        </ul>
        <form action={createCheckoutSession} className="mt-8">
          <button
            type="submit"
            className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Subscribe
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-muted">
          You&apos;ll be asked to log in or create an account first.
        </p>
      </Panel>
    </div>
  );
}
