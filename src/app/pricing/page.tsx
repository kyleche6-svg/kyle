import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { createCheckoutSession } from "@/app/actions/billing";
import { Panel } from "@/components/Panel";

const features = [
  "USD strength dashboard with live currency & commodity views",
  "Economic calendar with high-impact event tracking",
  "Stock screener with real third-party analyst consensus data",
  "Insider trading feed — every SEC Form 4 filing, live from EDGAR",
  "Real SEC 13F institutional holdings for major funds",
  "Daily AI-written market brief, grounded in real site data",
  "Full access to all future dashboard features",
];

// $12.99 is the real, currently-charged monthly price — $16.24 is the
// real Stripe base price with a genuine 20%-off launch coupon applied at
// checkout (see createCheckoutSession), not a fabricated "was" price for
// display purposes only.
const monthlyOgPrice = 16.24;
const monthlyPrice = 12.99;
const monthlyDiscountPercent = Math.round((1 - monthlyPrice / monthlyOgPrice) * 100);
const yearlyPrice = 99.99;
const yearlySavingsPercent = Math.round(
  (1 - yearlyPrice / (monthlyPrice * 12)) * 100,
);

function FeatureList() {
  return (
    <ul className="mt-8 flex flex-col gap-3 text-sm">
      {features.map((feature) => (
        <li key={feature} className="flex gap-2">
          <CheckCircle
            size={18}
            weight="fill"
            className="mt-0.5 shrink-0 text-accent"
          />
          <span className="text-foreground/90">{feature}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-20">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Pricing</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          DollarWatch is a market-intelligence dashboard: real USD/currency data, an economic
          calendar, SEC insider trading filings, institutional 13F holdings, and analyst
          consensus — all sourced from real, attributed data, never a generated prediction.
          Everything included on every plan. Cancel anytime.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
        <Panel className="relative">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-positive px-3 py-1 text-xs font-medium text-background">
            {monthlyDiscountPercent}% off
          </span>
          <div className="text-center">
            <p className="text-sm text-muted">Monthly</p>
            <p className="mt-2 font-mono text-sm text-muted line-through">${monthlyOgPrice}/month</p>
            <p className="font-mono text-4xl font-semibold">
              ${monthlyPrice}
              <span className="text-lg text-muted">/month</span>
            </p>
          </div>
          <FeatureList />
          <form action={createCheckoutSession} className="mt-8">
            <input type="hidden" name="plan" value="monthly" />
            <button
              type="submit"
              className="w-full rounded-md border border-panel-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-background"
            >
              Subscribe monthly
            </button>
          </form>
        </Panel>

        <Panel className="relative border-accent/40">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-background">
            Save {yearlySavingsPercent}%
          </span>
          <div className="text-center">
            <p className="text-sm text-muted">Yearly</p>
            <p className="mt-2 font-mono text-4xl font-semibold">
              ${yearlyPrice}
              <span className="text-lg text-muted">/year</span>
            </p>
          </div>
          <FeatureList />
          <form action={createCheckoutSession} className="mt-8">
            <input type="hidden" name="plan" value="yearly" />
            <button
              type="submit"
              className="w-full rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Subscribe yearly
            </button>
          </form>
        </Panel>
      </div>

      <p className="mt-6 text-center text-xs text-muted">
        You&apos;ll be asked to log in or create an account first.
      </p>
    </div>
  );
}
