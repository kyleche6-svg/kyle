import { prisma } from "@/lib/prisma";
import { getQuote } from "@/lib/market-data";
import { TRENDING_TICKERS } from "@/lib/stocks";

// Checked on page view rather than via a background job — consistent with
// this app's existing "refresh on view" pattern elsewhere (dashboard
// quotes, economic calendar). Real-time push alerting would need a
// scheduled worker, which is a documented follow-up, not built here.
export async function checkAndUpdateAlerts(userId: string) {
  const alerts = await prisma.priceAlert.findMany({
    where: { userId, triggered: false },
    orderBy: { createdAt: "desc" },
  });

  for (const alert of alerts) {
    const trending = TRENDING_TICKERS.find((t) => t.ticker === alert.ticker);
    const basePrice = trending?.basePrice ?? alert.targetPrice;
    const quote = await getQuote(alert.ticker, trending?.companyName ?? alert.ticker, basePrice);

    const crossed =
      alert.direction === "above" ? quote.price >= alert.targetPrice : quote.price <= alert.targetPrice;

    if (crossed) {
      await prisma.priceAlert.update({
        where: { id: alert.id },
        data: { triggered: true, triggeredAt: new Date() },
      });
    }
  }

  return prisma.priceAlert.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}
