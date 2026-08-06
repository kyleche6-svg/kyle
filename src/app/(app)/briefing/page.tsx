import { Newspaper } from "@phosphor-icons/react/dist/ssr";
import { requireActiveSubscription } from "@/lib/subscription-guard";
import { getDailyBrief } from "@/lib/daily-brief";
import { Panel } from "@/components/Panel";
import { Disclaimer } from "@/components/Disclaimer";

export default async function BriefingPage() {
  await requireActiveSubscription();

  const brief = await getDailyBrief();

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center gap-2 text-xs text-muted">
        <Newspaper size={16} />
        Daily Market Brief · {brief.dateLabel}
      </div>
      <h1 className="animate-rise-in mt-2 text-3xl font-semibold tracking-tight">{brief.headline}</h1>
      <p className="mt-2 text-xs text-muted">
        Written from real data already on this site (currency &amp; commodity quotes, today&apos;s
        economic calendar, stock movers, Senate trade disclosures) — regenerated once per day.
        Descriptive only, never a prediction or recommendation.
      </p>

      <div className="stagger-children mt-8 flex flex-col gap-6">
        {brief.sections.map((section, i) => (
          <Panel key={i}>
            <h2 className="text-base font-semibold">{section.heading}</h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">{section.body}</p>
          </Panel>
        ))}
      </div>

      <div className="mt-6">
        <Disclaimer />
      </div>
    </div>
  );
}
