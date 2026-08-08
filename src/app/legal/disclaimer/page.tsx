export default function DisclaimerPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Financial Disclaimer</h1>
      <div className="mt-6 flex flex-col gap-6 text-sm text-muted">
        <section>
          <h2 className="mb-2 text-foreground">Not investment advice</h2>
          <p>
            DollarWatch is an informational tool only. Nothing on this site
            constitutes investment, financial, legal, or tax advice, or a
            recommendation to buy, sell, or hold any security, currency, or
            commodity.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-foreground">No guarantee of results</h2>
          <p>
            We make no representation or warranty as to the accuracy,
            completeness, or timeliness of any data shown, including
            currency prices, insider trading disclosures, or institutional
            holdings data.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-foreground">
            Past patterns are not predictive
          </h2>
          <p>
            Historical statistics and price patterns shown on this site are
            observations only. They do not predict future price movements
            and should not be relied upon as a trading signal.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-foreground">Consult a professional</h2>
          <p>
            Before making any financial decision, consult a licensed
            financial advisor. DollarWatch and its operators are not
            registered investment advisors.
          </p>
        </section>
      </div>
    </div>
  );
}
