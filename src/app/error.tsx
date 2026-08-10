"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowClockwise, House } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/Logo";

// Catches genuine runtime crashes (a bad DB connection, an unhandled
// exception) so a visitor sees a branded "temporarily unavailable"
// screen instead of Next.js's raw error page. Deliberately does not try
// to explain *why* — the real cause belongs in server logs, not in
// front of a visitor.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("unhandled page error", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <Logo size={32} />
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Temporarily unavailable</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        Something went wrong loading this page. This is usually brief — try again in a moment.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={() => retry()}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90"
          style={{ background: "var(--gradient-brand)" }}
        >
          <ArrowClockwise size={16} weight="bold" />
          Try again
        </button>
        <Link
          href="/"
          className="flex items-center gap-1.5 border border-panel-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-panel"
        >
          <House size={16} />
          Go home
        </Link>
      </div>
    </div>
  );
}
