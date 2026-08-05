import Link from "next/link";
import { Panel } from "@/components/Panel";
import { StatNumber } from "@/components/StatNumber";

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-20">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight">
          Market intelligence, without the noise.
        </h1>
        <p className="mt-4 text-lg text-muted">
          USD strength, congressional trading disclosures, and market-moving
          posts — tracked and correlated in one dashboard.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            href="/pricing"
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            View pricing
          </Link>
          <Link
            href="/signup"
            className="rounded-md border border-panel-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-panel"
          >
            Create account
          </Link>
        </div>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Panel title="USD Index">
          <StatNumber label="DXY" value="104.28" delta="+0.34%" accent />
        </Panel>
        <Panel title="Congress">
          <StatNumber label="Trades this week" value="142" delta="+18" />
        </Panel>
        <Panel title="Tracked posts">
          <StatNumber label="Tagged this week" value="27" delta="+6" />
        </Panel>
      </div>
    </div>
  );
}
