import type { ReactNode } from "react";

// Shared header for every authenticated app page — one consistent title
// scale/spacing/motion instead of each page inventing its own text-2xl vs
// text-3xl, so the app reads as one product rather than a pile of screens
// built at different times.
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="animate-rise-in text-3xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="animate-rise-in mt-2 max-w-2xl text-sm text-muted" style={{ animationDelay: "60ms" }}>
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
