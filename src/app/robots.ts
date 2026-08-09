import type { MetadataRoute } from "next";

// Gated app pages redirect to /pricing without a session anyway, but
// disallow them explicitly so crawlers don't waste time discovering
// that themselves.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/briefing",
        "/stocks",
        "/watchlist",
        "/top-traders",
        "/insider-trading",
        "/compare",
        "/heatmap",
        "/earnings-calendar",
        "/dividend-calendar",
        "/account",
        "/api/",
      ],
    },
    sitemap: "https://dollarwatch.watch/sitemap.xml",
  };
}
