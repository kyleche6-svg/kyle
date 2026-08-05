import { PlaceholderBanner } from "@/components/PlaceholderBanner";

export default function RefundPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <PlaceholderBanner />
      <h1 className="text-2xl font-semibold">Refund &amp; Cancellation Policy</h1>
      <div className="mt-6 flex flex-col gap-6 text-sm text-muted">
        <section>
          <h2 className="mb-2 text-foreground">Cancellation</h2>
          <p>
            [PLACEHOLDER] You can cancel your subscription at any time from
            the Account page via the Stripe billing portal. Cancellation
            takes effect at the end of your current billing period; you
            retain access until then.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-foreground">Refunds</h2>
          <p>
            [PLACEHOLDER] Subscription payments are non-refundable except
            where required by law. If you believe you were charged in error,
            contact support within 14 days of the charge.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-foreground">Billing disputes</h2>
          <p>
            [PLACEHOLDER] For billing questions, contact us before initiating
            a chargeback with your card issuer.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-foreground">Contact us</h2>
          <p>
            [PLACEHOLDER — replace with your real support address]{" "}
            billing@yourdomain.com
          </p>
        </section>
      </div>
    </div>
  );
}
