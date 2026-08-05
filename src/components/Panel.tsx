import type { ReactNode } from "react";

export function Panel({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-panel-border bg-[linear-gradient(180deg,color-mix(in_srgb,var(--panel)_100%,white_5%)_0%,var(--panel)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_16px_-4px_rgba(0,0,0,0.5),0_16px_32px_-12px_rgba(0,0,0,0.4)] ${className}`}
    >
      {title && (
        <h2 className="mb-3 text-sm font-medium text-muted">{title}</h2>
      )}
      {children}
    </section>
  );
}
