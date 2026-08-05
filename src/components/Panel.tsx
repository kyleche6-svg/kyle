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
      className={`rounded-lg border border-panel-border bg-panel p-6 ${className}`}
    >
      {title && (
        <h2 className="mb-4 text-sm font-medium text-muted">{title}</h2>
      )}
      {children}
    </section>
  );
}
