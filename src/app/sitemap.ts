import type { MetadataRoute } from "next";

const BASE_URL = "https://dollarwatch.watch";

// Only public, unauthenticated pages — the actual dashboard/data pages
// require an active subscription and return nothing useful to a
// crawler (a redirect to /pricing), so indexing them would just waste
// crawl budget and confuse search results.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = [
    { path: "/", priority: 1, changeFrequency: "daily" as const },
    { path: "/pricing", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/support", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/login", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/signup", priority: 0.6, changeFrequency: "yearly" as const },
    { path: "/legal/terms", priority: 0.2, changeFrequency: "yearly" as const },
    { path: "/legal/privacy", priority: 0.2, changeFrequency: "yearly" as const },
    { path: "/legal/disclaimer", priority: 0.2, changeFrequency: "yearly" as const },
    { path: "/legal/refund", priority: 0.2, changeFrequency: "yearly" as const },
  ];

  return routes.map((route) => ({
    url: `${BASE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
