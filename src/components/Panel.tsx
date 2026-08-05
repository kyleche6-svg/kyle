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
      className={`rounded-lg border border-panel-border bg-panel p-4 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.4)] ${className}`}
    >
      {title && (
        <h2 className="mb-3 text-sm font-medium text-muted">{title}</h2>
      )}
      {children}
    </section>
  );
}
