import { PlaceholderBanner } from "@/components/PlaceholderBanner";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <PlaceholderBanner />
      <h1 className="text-2xl font-semibold">Privacy Policy</h1>
      <div className="mt-6 flex flex-col gap-6 text-sm text-muted">
        <section>
          <h2 className="mb-2 text-foreground">1. Data we collect</h2>
          <p>
            [PLACEHOLDER] We collect your email address, a hashed password,
            billing information (processed by Stripe — we do not store your
            card details), and basic usage/analytics data (pages visited,
            timestamps).
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-foreground">2. How we use your data</h2>
          <p>
            [PLACEHOLDER] We use your data to operate your account, process
            billing, and improve the product. We do not sell your personal
            data.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-foreground">3. Third parties</h2>
          <p>
            [PLACEHOLDER] We share data with the following third parties as
            necessary to operate the service: Stripe (billing), Twelve Data
            (market data), and X/Twitter (post data). Each processes data
            under their own privacy policy.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-foreground">
            4. Cookies
          </h2>
          <p>
            [PLACEHOLDER] We use essential cookies for authentication and
            session management. We do not use third-party advertising
            cookies. No separate cookie banner is shown because we only use
            strictly necessary cookies.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-foreground">
            5. Your rights (GDPR / CCPA)
          </h2>
          <p>
            [PLACEHOLDER] If you are located in the EU or California, you
            have the right to access, correct, or delete your personal data,
            and to object to or restrict certain processing. You can delete
            your account and data yourself at any time from the Account
            page, or contact us (below) to exercise these rights.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-foreground">6. Data retention</h2>
          <p>
            [PLACEHOLDER] We retain your account data for as long as your
            account is active, and for a limited period after cancellation
            as required for legal and billing purposes. Deleting your
            account removes your data immediately.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-foreground">7. Contact us</h2>
          <p>
            [PLACEHOLDER — replace with your real support address]{" "}
            privacy@yourdomain.com
          </p>
        </section>
      </div>
    </div>
  );
}
