import type { CSSProperties, ReactNode } from "react";

export function Panel({
  title,
  children,
  className = "",
  style,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <section
      className={`group rounded-lg border border-panel-border bg-[linear-gradient(160deg,color-mix(in_srgb,var(--panel)_100%,var(--accent)_4%)_0%,var(--panel)_70%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_2px_8px_-4px_rgba(2,6,20,0.5)] transition-[box-shadow,border-color] duration-200 ease-out hover:border-[color-mix(in_srgb,var(--accent)_30%,var(--panel-border))] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_20px_-8px_rgba(2,6,20,0.6)] ${className}`}
      style={style}
    >
      {title && (
        <h2 className="mb-3 text-sm font-medium text-muted">{title}</h2>
      )}
      {children}
    </section>
  );
}
