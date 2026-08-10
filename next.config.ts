import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Full security header set. CSP is scoped against what this app actually
  // loads client-side: same-origin scripts/styles/images/fonts, Turnstile's
  // challenge script + iframe (dormant until NEXT_PUBLIC_TURNSTILE_SITE_KEY
  // is set, but allowed now so turning it on later doesn't silently break),
  // and same-origin-only fetches (/api/chat, server actions) — Stripe
  // Checkout is a full-page redirect to a Stripe-hosted URL, not an
  // embedded script/frame, so it needs no CSP allowance here. style-src
  // 'unsafe-inline' is required: the app uses React inline `style` props
  // throughout (dynamic gradients/colors), which CSP treats as inline
  // styles regardless of Tailwind.
  async headers() {
    // Dev needs 'unsafe-eval' for Turbopack's HMR runtime — scoped to
    // development only so the production policy stays strict.
    const scriptSrc =
      process.env.NODE_ENV === "development"
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com"
        : "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com";

    const csp = [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-src https://challenges.cloudflare.com",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
