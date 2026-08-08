export default function RefundPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Refund &amp; Cancellation Policy</h1>
      <p className="mt-2 text-xs text-muted">
        This is a plain, good-faith policy, not formal legal language reviewed by an attorney —
        if this project ever grows beyond its current scope, get real legal review before relying
        on this page.
      </p>
      <div className="mt-6 flex flex-col gap-6 text-sm text-muted">
        <section>
          <h2 className="mb-2 text-foreground">Cancellation</h2>
          <p>
            You can cancel your subscription at any time from the Account page via the billing
            portal. Cancellation takes effect at the end of your current billing period — you
            keep access until then, and you will not be charged again after that.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-foreground">Refunds</h2>
          <p>
            If you were charged in error, charged after you believed you&apos;d already canceled,
            or are unhappy with your purchase within 1 day of the charge, contact support and
            you&apos;ll get a full refund — no questions asked. After 1 day, refunds are handled
            case by case.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-foreground">Billing disputes</h2>
          <p>
            Please contact support before filing a chargeback with your card issuer — most issues
            can be resolved directly and faster that way.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-foreground">Contact us</h2>
          <p>See the Support page for how to reach us.</p>
        </section>
      </div>
    </div>
  );
}
