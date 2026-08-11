import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

const faqs = [
  {
    q: "Is anything on DollarWatch investment advice?",
    a: "No. Every page shows real, attributed third-party data — SEC filings, real analyst consensus, historical statistics. DollarWatch never generates its own buy/sell call or price prediction, and never will.",
  },
  {
    q: "How do I cancel my subscription?",
    a: "Go to Account, then “Manage billing” — that opens Stripe's billing portal, where you can cancel anytime. Cancellation takes effect at the end of the current billing period; you keep access until then.",
  },
  {
    q: "How current is the data?",
    a: "It depends on the source: insider trading and 13F holdings are as current as each SEC filing (real filers report on their own schedule), the economic calendar refreshes hourly from the Federal Reserve, and stock quotes refresh every few minutes.",
  },
  {
    q: "Why do gainers/losers only show a specific list of stocks, not the whole market?",
    a: "A true whole-market screener requires a paid market-data plan. We track a broad list of large-cap stocks across sectors, but any stock's own page can be looked up directly by ticker search regardless of whether it's on that tracked list.",
  },
  {
    q: "Do you store my payment details?",
    a: "No. All billing runs through Stripe Checkout and the Stripe Customer Portal — DollarWatch never sees or stores card numbers.",
  },
  {
    q: "How do I delete my account?",
    a: "Go to Account and choose “Delete account.” This cancels any active subscription and permanently removes your data.",
  },
];

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <PageHeader
        title="Customer Support"
        description="Answers to common questions. If yours isn't covered, reach out and we'll help."
      />

      <div className="mt-8 flex flex-col gap-6">
        {faqs.map((item) => (
          <div key={item.q} className="border-b border-panel-border pb-6 last:border-0">
            <h2 className="text-sm font-medium">{item.q}</h2>
            <p className="mt-1.5 text-sm text-muted">{item.a}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-md border border-panel-border bg-panel p-5">
        <h2 className="text-sm font-medium">Still need help?</h2>
        <p className="mt-1.5 text-sm text-muted">
          <a href="mailto:support@dollarwatch.watch" className="text-accent hover:underline">
            support@dollarwatch.watch
          </a>
        </p>
        <p className="mt-3 text-xs text-muted">
          Billing-specific questions: see the{" "}
          <Link href="/legal/refund" className="text-accent hover:underline">
            Refund &amp; Cancellation Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
