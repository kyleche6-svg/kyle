import { Newspaper } from "@phosphor-icons/react/dist/ssr";
import { requireActiveSubscription } from "@/lib/subscription-guard";
import { getDailyBrief } from "@/lib/daily-brief";
import { Panel } from "@/components/Panel";
import { Disclaimer } from "@/components/Disclaimer";
import { ScrollReveal } from "@/components/ScrollReveal";

export default async function BriefingPage() {
  await requireActiveSubscription();

  const brief = await getDailyBrief();

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="animate-rise-in text-4xl leading-tight font-semibold tracking-tight text-balance">
        {brief.headline}
      </h1>
      <div className="animate-rise-in mt-3 flex items-center gap-1.5 text-xs text-muted" style={{ animationDelay: "60ms" }}>
        <Newspaper size={14} />
        {brief.dateLabel}
      </div>
      <p className="mt-4 max-w-2xl text-sm text-muted">
        Written from real data already on this site (currency &amp; commodity quotes, today&apos;s
        economic calendar, stock movers, insider trading disclosures) — regenerated once per day.
        Descriptive only, never a prediction or recommendation.
      </p>

      <div className="mt-10 flex flex-col gap-5">
        {brief.sections.map((section, i) => (
          <ScrollReveal key={i} delayMs={i * 80}>
            <Panel>
              <h2 className="text-base font-semibold">{section.heading}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-foreground/90">{section.body}</p>
            </Panel>
          </ScrollReveal>
        ))}
      </div>

      <div className="mt-6">
        <Disclaimer />
      </div>
    </div>
  );
}
