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
      className={`group rounded-2xl border border-panel-border bg-[linear-gradient(160deg,color-mix(in_srgb,var(--panel)_100%,var(--accent)_6%)_0%,var(--panel)_60%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_4px_20px_-4px_rgba(2,6,20,0.6),0_20px_40px_-16px_rgba(2,6,20,0.5)] backdrop-blur-sm transition-[transform,box-shadow,border-color,filter] duration-300 ease-out hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--panel-border))] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_color-mix(in_srgb,var(--accent)_15%,transparent),0_10px_28px_-6px_rgba(2,6,20,0.7),0_28px_56px_-16px_rgba(77,141,255,0.18)] active:scale-[0.97] active:brightness-90 active:duration-100 ${className}`}
    >
      {title && (
        <h2 className="mb-3 text-sm font-medium text-muted">{title}</h2>
      )}
      {children}
    </section>
  );
}
