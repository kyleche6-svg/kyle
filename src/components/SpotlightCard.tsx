"use client";

import { useRef, type ReactNode } from "react";

// Cursor-tracked radial highlight — the glow follows the pointer inside
// the card instead of a flat hover state, via a CSS custom property
// written directly to the element (bypassing React state/re-render for
// something that needs to update every mousemove frame).
export function SpotlightCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
        el.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
      }}
      className={`group/spot relative overflow-hidden ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{
          background:
            "radial-gradient(220px circle at var(--spot-x, 50%) var(--spot-y, 50%), color-mix(in srgb, var(--accent) 15%, transparent), transparent 70%)",
        }}
      />
      {children}
    </div>
  );
}
