"use client";

import Script from "next/script";

// Renders nothing if no site key is configured (unconfigured Turnstile is
// silently skipped server-side too — see src/lib/turnstile.ts). Once a real
// NEXT_PUBLIC_TURNSTILE_SITE_KEY is set, this renders the real widget and
// the form won't submit without a valid token.
export function TurnstileWidget() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        async
        defer
      />
      <div className="cf-turnstile" data-sitekey={siteKey} />
    </>
  );
}
