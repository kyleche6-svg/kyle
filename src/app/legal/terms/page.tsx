import { PlaceholderBanner } from "@/components/PlaceholderBanner";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <PlaceholderBanner />
      <h1 className="text-2xl font-semibold">Terms of Service</h1>
      <div className="mt-6 flex flex-col gap-6 text-sm text-muted">
        <section>
          <h2 className="mb-2 text-foreground">1. Acceptance of terms</h2>
          <p>
            [PLACEHOLDER] By creating an account or subscribing, you agree to
            these Terms of Service. If you do not agree, do not use
            DollarWatch.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-foreground">2. Account terms</h2>
          <p>
            [PLACEHOLDER] You are responsible for maintaining the
            confidentiality of your account credentials and for all activity
            under your account. You must be at least 18 years old to use this
            service.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-foreground">3. Acceptable use</h2>
          <p>
            [PLACEHOLDER] You agree not to scrape, resell, or redistribute
            data from this service, or to use it in a way that violates
            applicable law.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-foreground">4. Limitation of liability</h2>
          <p>
            [PLACEHOLDER] DollarWatch is provided &quot;as is&quot; without
            warranties of any kind. To the maximum extent permitted by law,
            DollarWatch is not liable for any indirect, incidental, or
            consequential damages, including trading losses, arising from
            your use of this service.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-foreground">5. Changes to these terms</h2>
          <p>
            [PLACEHOLDER] We may update these terms from time to time.
            Continued use of the service after changes constitutes
            acceptance of the revised terms.
          </p>
        </section>
      </div>
    </div>
  );
}
