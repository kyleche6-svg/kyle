import { prisma } from "@/lib/prisma";
import { getQuote } from "@/lib/market-data";
import { TRENDING_TICKERS } from "@/lib/stocks";
import { sendPriceAlertEmail } from "@/lib/email";

async function quoteFor(ticker: string, fallbackBasePrice: number) {
  const trending = TRENDING_TICKERS.find((t) => t.ticker === ticker);
  return getQuote(ticker, trending?.companyName ?? ticker, trending?.basePrice ?? fallbackBasePrice);
}

// Checked on page view for instant feedback when a user is actively
// looking — does NOT send email itself, only flips `triggered`. Real
// notification delivery is checkAllAlerts() below, run on a schedule (see
// /api/cron/check-alerts) so an alert fires even if the user never opens
// the app at the right moment. Keeping this path email-free avoids a race
// where both paths fire on the same alert and double-send.
export async function checkAndUpdateAlerts(userId: string) {
  const alerts = await prisma.priceAlert.findMany({
    where: { userId, triggered: false },
    orderBy: { createdAt: "desc" },
  });

  for (const alert of alerts) {
    const quote = await quoteFor(alert.ticker, alert.targetPrice);
    const crossed =
      alert.direction === "above" ? quote.price >= alert.targetPrice : quote.price <= alert.targetPrice;

    if (crossed) {
      await prisma.priceAlert.updateMany({
        where: { id: alert.id, triggered: false },
        data: { triggered: true, triggeredAt: new Date() },
      });
    }
  }

  return prisma.priceAlert.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

// Scheduled sweep across every user's untriggered alerts — the actual
// notification path. Grouped by ticker so a popular ticker with many
// alerts across different users only costs one quote fetch, not one per
// alert (real cost concern: the market-data API has a daily credit cap).
export async function checkAllAlerts(): Promise<{ checked: number; triggered: number }> {
  const alerts = await prisma.priceAlert.findMany({
    where: { triggered: false },
    include: { user: { select: { email: true } } },
  });

  const byTicker = new Map<string, typeof alerts>();
  for (const alert of alerts) {
    const list = byTicker.get(alert.ticker) ?? [];
    list.push(alert);
    byTicker.set(alert.ticker, list);
  }

  let triggeredCount = 0;

  for (const [ticker, tickerAlerts] of byTicker) {
    const quote = await quoteFor(ticker, tickerAlerts[0].targetPrice);

    for (const alert of tickerAlerts) {
      const crossed =
        alert.direction === "above" ? quote.price >= alert.targetPrice : quote.price <= alert.targetPrice;
      if (!crossed) continue;

      // updateMany + triggered:false guard: only the first writer for this
      // alert flips it and sends the email, even if this sweep somehow
      // overlaps with a concurrent run.
      const result = await prisma.priceAlert.updateMany({
        where: { id: alert.id, triggered: false },
        data: { triggered: true, triggeredAt: new Date() },
      });
      if (result.count === 0) continue;

      triggeredCount += 1;
      await sendPriceAlertEmail(alert.user.email, ticker, alert.direction, alert.targetPrice, quote.price);
    }
  }

  return { checked: alerts.length, triggered: triggeredCount };
}
